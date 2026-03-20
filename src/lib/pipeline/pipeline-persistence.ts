import type { Pipeline } from "@/types";
import type {
  ControllerSnapshot,
  PersistedStepArtifact,
  PersistedStepContext,
  StepAlias,
  StepSnapshot,
} from "@/types/pipeline-debug";
import { buildStepAliases } from "./dag-validator";

export interface CheckpointArtifact {
  executionId: string;
  pipelineId: string;
  generatedAt: string;
  pipelineStructureHash: string;
  isDirty: boolean;
  runtime: {
    mode: string;
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
    startStepId?: string | null;
    reusedAliases?: string[];
    staleContextWarning?: string | null;
    completedAt?: number | null;
    currentStepIndex?: number;
    totalSteps?: number;
    errorMessage?: string | null;
    pipeline?: Pipeline;
  }
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
      startStepId: options.startStepId ?? null,
      reusedAliases: options.reusedAliases ?? [],
      staleContextWarning: options.staleContextWarning ?? null,
      completedAt: options.completedAt != null ? new Date(options.completedAt).toISOString() : null,
      currentStepIndex: options.currentStepIndex ?? 0,
      totalSteps: options.totalSteps ?? snapshots.length,
      errorMessage: options.errorMessage ?? null,
    },
    steps: snapshots.map((snapshot) =>
      toStepArtifact(snapshot, aliasByStepId.get(snapshot.stepId) ?? "")
    ),
    stepContextByAlias: buildContextByAlias(aliases, runtimeVariables, snapshots),
    warnings: options.staleContextWarning ? [options.staleContextWarning] : [],
  };
}

export function restoreFromCheckpoint(artifact: CheckpointArtifact): ControllerSnapshot {
  const runtimeCompletedAt =
    artifact.runtime.completedAt !== null ? new Date(artifact.runtime.completedAt).getTime() : null;

  const snapshots = artifact.steps.map((step, i) => ({
    stepId: step.stepId,
    stepIndex: i,
    stepName: step.stepName,
    entryType: "request" as const,
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
    variables: buildRuntimeFromArtifact(artifact),
    error: step.error,
    startedAt: null,
    completedAt: step.completedAt !== null ? new Date(step.completedAt).getTime() : null,
    streamStatus: "done" as const,
    streamChunks: [] as string[],
  }));

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
    currentStepIndex: artifact.runtime.currentStepIndex,
    totalSteps: artifact.runtime.totalSteps,
    snapshots,
    runtimeVariables: buildRuntimeFromArtifact(artifact),
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
      .map((context) => [context.alias, cloneVal(context.payload)])
  );
}

function toStepArtifact(snapshot: StepSnapshot, alias: string): PersistedStepArtifact {
  return {
    stepId: snapshot.stepId,
    alias,
    stepName: snapshot.stepName,
    method: snapshot.method,
    url: snapshot.url,
    status: snapshot.status,
    reducedResponse: snapshot.reducedResponse,
    resolvedRequestSummary: {
      url: snapshot.resolvedRequest.url,
      headers: snapshot.resolvedRequest.headers,
      bodyPreview: snapshot.resolvedRequest.body?.slice(0, 400) ?? null,
    },
    error: snapshot.error,
    completedAt: snapshot.completedAt != null ? new Date(snapshot.completedAt).toISOString() : null,
  };
}

function buildContextByAlias(
  aliases: StepAlias[],
  runtimeVariables: Record<string, unknown>,
  snapshots: StepSnapshot[]
): Record<string, PersistedStepContext> {
  const snapshotByAlias = new Map(
    snapshots.filter((s) => s.status === "success").map((s) => [s.stepId, s] as const)
  );

  return Object.fromEntries(
    aliases
      .map((alias) => {
        const runtimeValue = runtimeVariables[alias.alias];
        if (runtimeValue && typeof runtimeValue === "object") {
          return [
            alias.alias,
            {
              stepId: alias.stepId,
              alias: alias.alias,
              payload: cloneVal(runtimeValue as Record<string, unknown>),
            } satisfies PersistedStepContext,
          ];
        }
        const snapshot = snapshotByAlias.get(alias.stepId);
        if (!snapshot) return null;
        return [
          alias.alias,
          {
            stepId: snapshot.stepId,
            alias: alias.alias,
            payload: {
              response: {
                status: snapshot.reducedResponse?.status ?? null,
                statusText: snapshot.reducedResponse?.statusText ?? "",
                time: snapshot.reducedResponse?.latencyMs ?? 0,
                size: snapshot.reducedResponse?.sizeBytes ?? 0,
                headers: cloneVal(snapshot.fullHeaders ?? snapshot.reducedResponse?.headers ?? {}),
                body: parseBody(snapshot.fullBody),
              },
            },
          } satisfies PersistedStepContext,
        ] as const;
      })
      .filter((e): e is [string, PersistedStepContext] => e !== null)
  );
}

function buildPipelineHash(pipeline: Pipeline): string {
  const raw = JSON.stringify(
    pipeline.steps.map((step) => ({
      id: step.id,
      method: step.method,
      url: step.url,
    }))
  );
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return `pipeline_${(hash >>> 0).toString(16)}`;
}

function parseBody(fullBody?: string) {
  if (!fullBody) return {};
  try {
    return JSON.parse(fullBody) as Record<string, unknown>;
  } catch {
    return { raw: fullBody.slice(0, 400) };
  }
}

function cloneVal<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}
