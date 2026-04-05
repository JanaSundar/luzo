import type { Pipeline, PipelineExecutionResult } from "@/types";
import type {
  DebugRuntimeState,
  PersistedExecutionArtifact,
  PersistedStepContext,
  StepAlias,
  StepSnapshot,
} from "@/types/pipeline-debug";
import { buildStepAliases } from "./dag-validator";
import {
  buildPipelineStepHash,
  buildStepContextByAlias,
  cloneSerializableValue,
  toPersistedStepArtifact,
} from "./persisted-artifact-shared";

const STALE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function buildExecutionArtifact(
  pipeline: Pipeline,
  snapshots: StepSnapshot[],
  runtime: DebugRuntimeState,
  runtimeVariables: Record<string, unknown>,
): PersistedExecutionArtifact {
  const aliases = buildStepAliases(pipeline.steps);
  const aliasByStepId = new Map(aliases.map((alias) => [alias.stepId, alias.alias]));

  return {
    pipelineId: pipeline.id,
    generatedAt: new Date().toISOString(),
    pipelineStructureHash: buildPipelineStructureHash(pipeline),
    runtime: {
      mode: runtime.mode,
      startStepId: runtime.startStepId,
      reusedAliases: runtime.reusedAliases,
      staleContextWarning: runtime.staleContextWarning,
      completedAt: runtime.completedAt,
    },
    steps: snapshots.map((snapshot) =>
      toPersistedStepArtifact(snapshot, aliasByStepId.get(snapshot.stepId) ?? ""),
    ),
    stepContextByAlias: buildContextByAlias(aliases, runtimeVariables, snapshots),
    warnings: runtime.staleContextWarning ? [runtime.staleContextWarning] : [],
  };
}

export function buildExecutionResultFromArtifact(
  artifact: PersistedExecutionArtifact,
): PipelineExecutionResult | null {
  if (artifact.steps.length === 0) return null;

  return {
    pipelineId: artifact.pipelineId,
    startTime: artifact.generatedAt,
    endTime:
      artifact.runtime.completedAt !== null
        ? new Date(artifact.runtime.completedAt).toISOString()
        : artifact.generatedAt,
    status: artifact.steps.some((step) => step.status === "error") ? "failed" : "completed",
    results: artifact.steps.map(toExecutionResultStep),
  };
}

export function buildRuntimeVariablesFromArtifact(
  artifact: PersistedExecutionArtifact,
  aliases?: string[],
): Record<string, unknown> {
  const activeAliases = aliases ?? Object.keys(artifact.stepContextByAlias);
  return Object.fromEntries(
    activeAliases
      .map((alias) => artifact.stepContextByAlias[alias])
      .filter((context): context is NonNullable<typeof context> => Boolean(context))
      .map((context) => [context.alias, cloneSerializableValue(context.payload)]),
  );
}

export function buildSnapshotsFromArtifact(artifact: PersistedExecutionArtifact): StepSnapshot[] {
  const runtimeVariables = buildRuntimeVariablesFromArtifact(artifact);

  return artifact.steps.map((step, stepIndex) =>
    toSnapshotFromArtifact(step, stepIndex, runtimeVariables),
  );
}

export function isArtifactStale(artifact: PersistedExecutionArtifact, pipeline: Pipeline) {
  const generatedAt =
    typeof artifact.generatedAt === "number"
      ? artifact.generatedAt
      : new Date(artifact.generatedAt).getTime();
  const tooOld = Date.now() - generatedAt > STALE_WINDOW_MS;
  const structureChanged = artifact.pipelineStructureHash !== buildPipelineStructureHash(pipeline);
  return tooOld || structureChanged;
}

export function getRequiredPreviousAliases(
  pipeline: Pipeline,
  startStepId: string,
  aliases: StepAlias[],
  collectDependencies: (step: Pipeline["steps"][number]) => Array<{ alias: string }>,
) {
  const startIndex = pipeline.steps.findIndex((step) => step.id === startStepId);
  if (startIndex === -1) return [];

  const allowedAliases = new Set(aliases.slice(0, startIndex).map((alias) => alias.alias));
  return [
    ...new Set(
      pipeline.steps
        .slice(startIndex)
        .flatMap((step) => collectDependencies(step).map((dependency) => dependency.alias))
        .filter((alias) => allowedAliases.has(alias)),
    ),
  ];
}

export function buildPipelineStructureHash(pipeline: Pipeline) {
  return buildPipelineStepHash(pipeline, (step) => ({
    id: step.id,
    method: step.method,
    url: step.url,
    headers: step.headers.map(({ key, value, enabled }) => ({ key, value, enabled })),
    params: step.params.map(({ key, value, enabled }) => ({ key, value, enabled })),
    body: step.body,
    bodyType: step.bodyType,
  }));
}

function toExecutionResultStep(step: PersistedExecutionArtifact["steps"][number]) {
  return {
    stepId: step.stepId,
    stepName: step.stepName,
    method: step.method,
    url: step.url,
    status: step.reducedResponse?.status ?? 0,
    statusText: step.reducedResponse?.statusText ?? "",
    headers: step.reducedResponse?.headers ?? {},
    body: JSON.stringify(step.reducedResponse?.summary ?? {}),
    time: step.reducedResponse?.latencyMs ?? 0,
    size: step.reducedResponse?.sizeBytes ?? 0,
  };
}

function toSnapshotFromArtifact(
  step: PersistedExecutionArtifact["steps"][number],
  stepIndex: number,
  runtimeVariables: Record<string, unknown>,
): StepSnapshot {
  return {
    stepId: step.stepId,
    stepIndex,
    stepName: step.stepName,
    entryType: "request",
    method: step.method,
    url: step.url,
    resolvedRequest: {
      method: step.method,
      url: step.resolvedRequestSummary.url,
      headers: step.resolvedRequestSummary.headers,
      body: step.resolvedRequestSummary.bodyPreview,
    },
    status: step.status,
    reducedResponse: step.reducedResponse,
    fullHeaders: step.reducedResponse?.headers,
    variables: runtimeVariables,
    error: step.error,
    startedAt: null,
    completedAt: null,
    streamStatus: "done",
    streamChunks: [],
  };
}

function buildContextByAlias(
  aliases: StepAlias[],
  runtimeVariables: Record<string, unknown>,
  snapshots: StepSnapshot[],
) {
  return buildStepContextByAlias(aliases, runtimeVariables, snapshots) as Record<
    string,
    PersistedStepContext
  >;
}
