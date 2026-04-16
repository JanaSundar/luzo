import type { CheckpointArtifact } from "@/features/pipeline/pipeline-persistence";
import type {
  PipelineRunDiff,
  PinnedBaselineArtifact,
  PersistedExecutionArtifact,
  StepRunDiff,
  StepRunDiffChange,
} from "@/types/pipeline-debug";

const SIGNIFICANT_LATENCY_DELTA_MS = 100;
const SIGNIFICANT_LATENCY_DELTA_PCT = 0.2;

interface ComparableStep {
  stepId: string;
  alias: string;
  stepName: string;
  status: string;
  latencyMs: number | null;
  summary: Record<string, unknown> | null;
  preRequestPassed: boolean | null;
  postRequestPassed: boolean | null;
  testsPassed: boolean | null;
}

type ComparableArtifact = PersistedExecutionArtifact | CheckpointArtifact;

export function buildPipelineRunDiff(
  currentArtifact: ComparableArtifact,
  baseline: PinnedBaselineArtifact,
): PipelineRunDiff {
  const baselineArtifact = baseline.artifact;
  const currentSteps = currentArtifact.steps.map(toComparableStep);
  const baselineSteps = baselineArtifact.steps.map(toComparableStep);
  const baselineByStepId = new Map(baselineSteps.map((step) => [step.stepId, step]));
  const baselineAliasCounts = new Map<string, number>();
  const baselineByAlias = new Map<string, ComparableStep>();

  for (const step of baselineSteps) {
    baselineAliasCounts.set(step.alias, (baselineAliasCounts.get(step.alias) ?? 0) + 1);
    baselineByAlias.set(step.alias, step);
  }

  const usedBaselineIds = new Set<string>();
  const stepsById: Record<string, StepRunDiff> = {};
  const orderedStepIds: string[] = [];
  let changedSteps = 0;
  let regressions = 0;
  let improvements = 0;
  let unchangedSteps = 0;

  for (const currentStep of currentSteps) {
    const baselineStep = resolveBaselineStep(
      currentStep,
      baselineByStepId,
      baselineByAlias,
      baselineAliasCounts,
      usedBaselineIds,
    );

    const diff = baselineStep
      ? compareMatchedSteps(currentStep, baselineStep)
      : createAddedStepDiff(currentStep);

    stepsById[currentStep.stepId] = diff;
    orderedStepIds.push(currentStep.stepId);

    if (diff.severity === "unchanged") unchangedSteps += 1;
    else {
      changedSteps += 1;
      if (diff.severity === "regression") regressions += 1;
      if (diff.severity === "improved") improvements += 1;
    }
  }

  const missingSteps = baselineSteps.filter((step) => !usedBaselineIds.has(step.stepId));
  const warnings: string[] = [];
  const structureChanged =
    currentArtifact.pipelineStructureHash !== baselineArtifact.pipelineStructureHash;

  if (structureChanged) {
    warnings.push("Pipeline structure changed since the pinned baseline.");
  }
  if (missingSteps.length > 0) {
    warnings.push(
      `${missingSteps.length} baseline step${missingSteps.length === 1 ? "" : "s"} no longer matched the current run.`,
    );
  }

  return {
    baselineGeneratedAt: baseline.sourceGeneratedAt,
    currentGeneratedAt: currentArtifact.generatedAt,
    structureChanged,
    summary: {
      severity:
        regressions > 0
          ? "regression"
          : changedSteps === 0
            ? "unchanged"
            : changedSteps === improvements
              ? "improved"
              : "changed",
      changedSteps,
      regressions,
      improvements,
      unchangedSteps,
      missingSteps: missingSteps.length,
      newSteps: currentSteps.filter((step) => !stepsById[step.stepId]?.isMatched).length,
      warnings,
    },
    orderedStepIds,
    stepsById,
  };
}

export function getStepRunDiff(
  diff: PipelineRunDiff | null | undefined,
  stepId: string | null | undefined,
) {
  if (!diff || !stepId) return null;
  return diff.stepsById[stepId] ?? null;
}

function resolveBaselineStep(
  currentStep: ComparableStep,
  baselineByStepId: Map<string, ComparableStep>,
  baselineByAlias: Map<string, ComparableStep>,
  baselineAliasCounts: Map<string, number>,
  usedBaselineIds: Set<string>,
) {
  const byId = baselineByStepId.get(currentStep.stepId);
  if (byId && !usedBaselineIds.has(byId.stepId)) {
    usedBaselineIds.add(byId.stepId);
    return byId;
  }

  if ((baselineAliasCounts.get(currentStep.alias) ?? 0) !== 1) return null;
  const byAlias = baselineByAlias.get(currentStep.alias);
  if (!byAlias || usedBaselineIds.has(byAlias.stepId)) return null;
  usedBaselineIds.add(byAlias.stepId);
  return byAlias;
}

function compareMatchedSteps(
  currentStep: ComparableStep,
  baselineStep: ComparableStep,
): StepRunDiff {
  const changes: StepRunDiffChange[] = [];

  if (currentStep.status !== baselineStep.status) {
    changes.push({
      kind: "status",
      severity: classifyStatusChange(baselineStep.status, currentStep.status),
      message: `Status changed from ${baselineStep.status} to ${currentStep.status}.`,
      before: baselineStep.status,
      after: currentStep.status,
    });
  }

  const latencyDeltaMs =
    currentStep.latencyMs != null && baselineStep.latencyMs != null
      ? currentStep.latencyMs - baselineStep.latencyMs
      : null;
  const latencyDeltaPct =
    latencyDeltaMs != null && baselineStep.latencyMs && baselineStep.latencyMs > 0
      ? latencyDeltaMs / baselineStep.latencyMs
      : null;

  if (
    latencyDeltaMs != null &&
    latencyDeltaPct != null &&
    Math.abs(latencyDeltaMs) >= SIGNIFICANT_LATENCY_DELTA_MS &&
    Math.abs(latencyDeltaPct) >= SIGNIFICANT_LATENCY_DELTA_PCT
  ) {
    changes.push({
      kind: "latency",
      severity: latencyDeltaMs > 0 ? "regression" : "improved",
      message:
        latencyDeltaMs > 0
          ? `Latency increased by ${latencyDeltaMs}ms.`
          : `Latency improved by ${Math.abs(latencyDeltaMs)}ms.`,
      before: baselineStep.latencyMs,
      after: currentStep.latencyMs,
    });
  }

  const baselineShape = buildShapeSignature(baselineStep.summary);
  const currentShape = buildShapeSignature(currentStep.summary);
  if (baselineShape !== currentShape) {
    changes.push({
      kind: "response-shape",
      severity: "regression",
      message: "Response shape changed from the pinned baseline.",
    });
  }

  const baselineSummary = stableSerialize(baselineStep.summary);
  const currentSummary = stableSerialize(currentStep.summary);
  if (baselineSummary !== currentSummary) {
    changes.push({
      kind: "response-summary",
      severity: changes.some((change) => change.kind === "response-shape")
        ? "regression"
        : "changed",
      message: "Reduced response summary changed.",
    });
  }

  pushBooleanChange(
    changes,
    "pre-request",
    "Pre-request script result",
    baselineStep.preRequestPassed,
    currentStep.preRequestPassed,
  );
  pushBooleanChange(
    changes,
    "post-request",
    "Post-request script result",
    baselineStep.postRequestPassed,
    currentStep.postRequestPassed,
  );
  pushBooleanChange(
    changes,
    "tests",
    "Test result",
    baselineStep.testsPassed,
    currentStep.testsPassed,
  );

  const severity = summarizeSeverity(changes);

  return {
    stepId: currentStep.stepId,
    baselineStepId: baselineStep.stepId,
    stepName: currentStep.stepName,
    severity,
    isMatched: true,
    statusChanged: currentStep.status !== baselineStep.status,
    latencyDeltaMs,
    latencyDeltaPct,
    responseShapeChanged: baselineShape !== currentShape,
    responseSummaryChanged: baselineSummary !== currentSummary,
    testsChanged: currentStep.testsPassed !== baselineStep.testsPassed,
    preRequestChanged: currentStep.preRequestPassed !== baselineStep.preRequestPassed,
    postRequestChanged: currentStep.postRequestPassed !== baselineStep.postRequestPassed,
    changes,
  };
}

function createAddedStepDiff(currentStep: ComparableStep): StepRunDiff {
  return {
    stepId: currentStep.stepId,
    baselineStepId: null,
    stepName: currentStep.stepName,
    severity: "changed",
    isMatched: false,
    statusChanged: false,
    latencyDeltaMs: null,
    latencyDeltaPct: null,
    responseShapeChanged: false,
    responseSummaryChanged: false,
    testsChanged: false,
    preRequestChanged: false,
    postRequestChanged: false,
    changes: [
      {
        kind: "step-added",
        severity: "changed",
        message: "Step is new relative to the pinned baseline.",
      },
    ],
  };
}

function toComparableStep(step: ComparableArtifact["steps"][number]): ComparableStep {
  return {
    stepId: step.stepId,
    alias: step.alias,
    stepName: step.stepName,
    status: step.status,
    latencyMs: step.reducedResponse?.latencyMs ?? null,
    summary: step.reducedResponse?.summary ?? null,
    preRequestPassed: step.preRequestPassed ?? null,
    postRequestPassed: step.postRequestPassed ?? null,
    testsPassed: step.testsPassed ?? null,
  };
}

function classifyStatusChange(
  before: string,
  after: string,
): "regression" | "improved" | "changed" {
  const beforeRank = getStatusRank(before);
  const afterRank = getStatusRank(after);
  if (afterRank < beforeRank) return "regression";
  if (afterRank > beforeRank) return "improved";
  return "changed";
}

function getStatusRank(status: string) {
  if (status === "success" || status === "done") return 3;
  if (status === "running" || status === "step_ready") return 2;
  if (status === "idle") return 1;
  if (status === "error") return 0;
  return 1;
}

function pushBooleanChange(
  changes: StepRunDiffChange[],
  kind: StepRunDiffChange["kind"],
  label: string,
  before: boolean | null,
  after: boolean | null,
) {
  if (before === after || before == null || after == null) return;
  changes.push({
    kind,
    severity: after ? "improved" : "regression",
    message: `${label} changed from ${before ? "pass" : "fail"} to ${after ? "pass" : "fail"}.`,
    before,
    after,
  });
}

function summarizeSeverity(changes: StepRunDiffChange[]): StepRunDiff["severity"] {
  if (changes.some((change) => change.severity === "regression")) return "regression";
  if (changes.some((change) => change.severity === "improved")) {
    return changes.every((change) => change.severity === "improved") ? "improved" : "changed";
  }
  if (changes.length > 0) return "changed";
  return "unchanged";
}

function buildShapeSignature(value: unknown): string {
  if (Array.isArray(value)) {
    return `array:[${[...new Set(value.map((entry) => buildShapeSignature(entry)))].sort().join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `object:{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${key}:${buildShapeSignature(entry)}`)
      .join(",")}}`;
  }
  return typeof value;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
