import { describe, expect, it } from "vitest";
import { buildPipelineRunDiff } from "@/features/pipeline/run-diff";
import type { PinnedBaselineArtifact, PersistedExecutionArtifact } from "@/types/pipeline-debug";

describe("buildPipelineRunDiff", () => {
  it("returns unchanged when the current run matches the baseline", () => {
    const current = makeArtifact();
    const diff = buildPipelineRunDiff(current, makeBaseline(current));

    expect(diff.summary.severity).toBe("unchanged");
    expect(diff.summary.regressions).toBe(0);
    expect(diff.stepsById["step-1"]?.changes).toHaveLength(0);
  });

  it("classifies status regressions and improvements", () => {
    const baseline = makeArtifact({
      steps: [makeStep({ status: "success", testsPassed: true })],
    });
    const current = makeArtifact({
      steps: [makeStep({ status: "error", testsPassed: false })],
    });

    const diff = buildPipelineRunDiff(current, makeBaseline(baseline));

    expect(diff.summary.severity).toBe("regression");
    expect(diff.stepsById["step-1"]?.severity).toBe("regression");
    expect(diff.stepsById["step-1"]?.changes.map((change) => change.kind)).toContain("status");
    expect(diff.stepsById["step-1"]?.changes.map((change) => change.kind)).toContain("tests");
  });

  it("classifies significant latency improvements", () => {
    const baseline = makeArtifact({
      steps: [makeStep({ reducedResponse: makeResponse({ latencyMs: 800 }) })],
    });
    const current = makeArtifact({
      steps: [makeStep({ reducedResponse: makeResponse({ latencyMs: 500 }) })],
    });

    const diff = buildPipelineRunDiff(current, makeBaseline(baseline));

    expect(diff.summary.improvements).toBe(1);
    expect(diff.stepsById["step-1"]?.severity).toBe("improved");
    expect(diff.stepsById["step-1"]?.latencyDeltaMs).toBe(-300);
  });

  it("detects response shape drift", () => {
    const baseline = makeArtifact({
      steps: [makeStep({ reducedResponse: makeResponse({ summary: { id: 1, name: "Ada" } }) })],
    });
    const current = makeArtifact({
      steps: [
        makeStep({
          reducedResponse: makeResponse({
            summary: { id: 1, profile: { email: "a@example.com" } },
          }),
        }),
      ],
    });

    const diff = buildPipelineRunDiff(current, makeBaseline(baseline));

    expect(diff.stepsById["step-1"]?.responseShapeChanged).toBe(true);
    expect(diff.stepsById["step-1"]?.severity).toBe("regression");
  });

  it("surfaces script and test outcome drift", () => {
    const baseline = makeArtifact({
      steps: [
        makeStep({
          postRequestPassed: true,
          preRequestPassed: true,
          testsPassed: true,
        }),
      ],
    });
    const current = makeArtifact({
      steps: [
        makeStep({
          postRequestPassed: false,
          preRequestPassed: true,
          testsPassed: false,
        }),
      ],
    });

    const diff = buildPipelineRunDiff(current, makeBaseline(baseline));

    expect(diff.stepsById["step-1"]?.postRequestChanged).toBe(true);
    expect(diff.stepsById["step-1"]?.testsChanged).toBe(true);
    expect(diff.summary.regressions).toBe(1);
  });

  it("adds structure mismatch warnings and compares safe matches only", () => {
    const baseline = makeArtifact({
      pipelineStructureHash: "pipeline_old",
      steps: [makeStep({ stepId: "step-old", alias: "req1" })],
    });
    const current = makeArtifact({
      pipelineStructureHash: "pipeline_new",
      steps: [
        makeStep({ stepId: "step-new", alias: "req1" }),
        makeStep({ stepId: "step-added", alias: "req2" }),
      ],
    });

    const diff = buildPipelineRunDiff(current, makeBaseline(baseline));

    expect(diff.structureChanged).toBe(true);
    expect(diff.summary.warnings[0]).toMatch(/structure changed/i);
    expect(diff.summary.newSteps).toBe(1);
    expect(diff.stepsById["step-new"]?.isMatched).toBe(true);
    expect(diff.stepsById["step-added"]?.isMatched).toBe(false);
  });
});

function makeBaseline(artifact: PersistedExecutionArtifact): PinnedBaselineArtifact {
  return {
    artifact,
    note: null,
    pinnedAt: "2026-04-15T00:00:00.000Z",
    sourceGeneratedAt: artifact.generatedAt,
  };
}

function makeArtifact(
  overrides: Partial<PersistedExecutionArtifact> = {},
): PersistedExecutionArtifact {
  return {
    generatedAt: "2026-04-15T00:00:00.000Z",
    pipelineId: "pipeline-1",
    pipelineStructureHash: "pipeline_hash",
    runtime: {
      completedAt: "2026-04-15T00:00:05.000Z",
      mode: "full",
      reusedAliases: [],
      staleContextWarning: null,
      startStepId: null,
    },
    stepContextByAlias: {},
    steps: [makeStep()],
    warnings: [],
    ...overrides,
  };
}

function makeStep(
  overrides: Partial<PersistedExecutionArtifact["steps"][number]> = {},
): PersistedExecutionArtifact["steps"][number] {
  return {
    alias: "req1",
    completedAt: "2026-04-15T00:00:05.000Z",
    error: null,
    method: "GET",
    postRequestPassed: true,
    preRequestPassed: true,
    reducedResponse: makeResponse(),
    resolvedRequestSummary: {
      bodyPreview: null,
      headers: {},
      url: "https://api.example.com/users",
    },
    status: "success",
    stepId: "step-1",
    stepName: "Fetch users",
    testsPassed: true,
    url: "https://api.example.com/users",
    ...overrides,
  };
}

function makeResponse(
  overrides: Partial<
    NonNullable<PersistedExecutionArtifact["steps"][number]["reducedResponse"]>
  > = {},
) {
  return {
    headers: {},
    latencyMs: 320,
    sizeBytes: 128,
    status: 200,
    statusText: "OK",
    summary: { id: 1, ok: true },
    ...overrides,
  };
}
