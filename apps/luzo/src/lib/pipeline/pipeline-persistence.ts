import type { Pipeline } from "@/types";
import type {
  ControllerSnapshot,
  PersistedStepArtifact,
  PersistedStepContext,
  StepSnapshot,
} from "@/types/pipeline-debug";
import { buildStepAliases } from "./dag-validator";
import {
  buildPipelineStepHash,
  buildStepContextByAlias,
  cloneSerializableValue,
  toPersistedStepArtifact,
} from "./persisted-artifact-shared";

export interface CheckpointArtifact {
  executionId: string;
  pipelineId: string;
  generatedAt: string;
  pipelineStructureHash: string;
  isDirty: boolean;
  runtime: {
    mode: string;
    originExecutionMode: "auto" | "debug";
    startStepId: string | null;
    reusedAliases: string[];
    staleContextWarning: string | null;
    completedAt: string | null;
    currentStepIndex: number;
    totalSteps: number;
    errorMessage: string | null;
  };
  steps: PersistedStepArtifact[];
  stepContextByAlias: Record<string, PersistedStepContext>;
  warnings: string[];
}

export function buildCheckpointArtifact(
  executionId: string,
  pipelineId: string,
  snapshots: StepSnapshot[],
  runtimeVariables: Record<string, unknown>,
  options: {
    isDirty: boolean;
    mode?: string;
    originExecutionMode?: "auto" | "debug";
    startStepId?: string | null;
    reusedAliases?: string[];
    staleContextWarning?: string | null;
    completedAt?: number | null;
    currentStepIndex?: number;
    totalSteps?: number;
    errorMessage?: string | null;
    pipeline?: Pipeline;
  },
): CheckpointArtifact {
  const pipeline = options.pipeline;
  const aliases = pipeline ? buildStepAliases(pipeline.steps) : [];
  const aliasByStepId = new Map(aliases.map((alias) => [alias.stepId, alias.alias]));

  return {
    executionId,
    pipelineId,
    generatedAt: new Date().toISOString(),
    pipelineStructureHash: pipeline ? buildPipelineHash(pipeline) : "",
    isDirty: options.isDirty,
    runtime: {
      mode: options.mode ?? "full",
      originExecutionMode: options.originExecutionMode ?? "auto",
      startStepId: options.startStepId ?? null,
      reusedAliases: options.reusedAliases ?? [],
      staleContextWarning: options.staleContextWarning ?? null,
      completedAt: options.completedAt != null ? new Date(options.completedAt).toISOString() : null,
      currentStepIndex: options.currentStepIndex ?? 0,
      totalSteps: options.totalSteps ?? snapshots.length,
      errorMessage: options.errorMessage ?? null,
    },
    steps: snapshots.map((snapshot) =>
      toPersistedStepArtifact(snapshot, aliasByStepId.get(snapshot.stepId) ?? ""),
    ),
    stepContextByAlias: buildContextByAlias(aliases, runtimeVariables, snapshots),
    warnings: options.staleContextWarning ? [options.staleContextWarning] : [],
  };
}

export function restoreFromCheckpoint(artifact: CheckpointArtifact): ControllerSnapshot {
  const runtimeCompletedAt =
    artifact.runtime.completedAt !== null ? new Date(artifact.runtime.completedAt).getTime() : null;
  const runtimeVariables = buildRuntimeFromArtifact(artifact);

  const snapshots = artifact.steps.map((step, stepIndex) =>
    toCheckpointSnapshot(step, stepIndex, runtimeVariables),
  );

  const lastSnapshot = snapshots[snapshots.length - 1];
  const completedAt =
    runtimeCompletedAt !== null ? runtimeCompletedAt : (lastSnapshot?.completedAt ?? null);

  let state: ControllerSnapshot["state"];
  if (lastSnapshot?.status === "error") {
    state = "error";
  } else if (artifact.isDirty) {
    state = "interrupted";
  } else {
    state = "completed";
  }

  return {
    executionId: artifact.executionId,
    state,
    originExecutionMode: artifact.runtime.originExecutionMode,
    currentStepIndex: artifact.runtime.currentStepIndex,
    totalSteps: artifact.runtime.totalSteps,
    snapshots,
    runtimeVariables,
    variableOverrides: {},
    errorMessage: artifact.runtime.errorMessage,
    startedAt: snapshots[0]?.startedAt ?? (completedAt !== null ? completedAt - 1000 : null),
    completedAt,
  };
}

export function isCheckpointDirty(artifact: CheckpointArtifact): boolean {
  return artifact.isDirty;
}

function buildRuntimeFromArtifact(artifact: CheckpointArtifact): Record<string, unknown> {
  return Object.fromEntries(
    Object.values(artifact.stepContextByAlias)
      .filter((context): context is PersistedStepContext => Boolean(context))
      .map((context) => [context.alias, cloneSerializableValue(context.payload)]),
  );
}

function buildContextByAlias(
  aliases: ReturnType<typeof buildStepAliases>,
  runtimeVariables: Record<string, unknown>,
  snapshots: StepSnapshot[],
): Record<string, PersistedStepContext> {
  return buildStepContextByAlias(aliases, runtimeVariables, snapshots) as Record<
    string,
    PersistedStepContext
  >;
}

function buildPipelineHash(pipeline: Pipeline): string {
  return buildPipelineStepHash(pipeline, (step) => ({
    id: step.id,
    method: step.method,
    url: step.url,
  }));
}

function toCheckpointSnapshot(
  step: PersistedStepArtifact,
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
    completedAt: step.completedAt !== null ? new Date(step.completedAt).getTime() : null,
    streamStatus: "done",
    streamChunks: [],
  };
}
