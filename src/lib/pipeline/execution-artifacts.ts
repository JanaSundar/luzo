import type { Pipeline, PipelineExecutionResult } from "@/types";
import type {
  DebugRuntimeState,
  PersistedExecutionArtifact,
  PersistedStepArtifact,
  PersistedStepContext,
  StepAlias,
  StepSnapshot,
} from "@/types/pipeline-debug";
import { buildStepAliases } from "./dag-validator";

const STALE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_BODY_PREVIEW = 400;

export function buildExecutionArtifact(
  pipeline: Pipeline,
  snapshots: StepSnapshot[],
  runtime: DebugRuntimeState,
  runtimeVariables: Record<string, unknown>
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
      toStepArtifact(snapshot, aliasByStepId.get(snapshot.stepId) ?? "")
    ),
    stepContextByAlias: buildContextByAlias(aliases, runtimeVariables, snapshots),
    warnings: runtime.staleContextWarning ? [runtime.staleContextWarning] : [],
  };
}

export function buildExecutionResultFromArtifact(
  artifact: PersistedExecutionArtifact
): PipelineExecutionResult | null {
  if (artifact.steps.length === 0) return null;

  return {
    pipelineId: artifact.pipelineId,
    startTime: artifact.generatedAt,
    endTime: artifact.runtime.completedAt ?? artifact.generatedAt,
    status: artifact.steps.some((step) => step.status === "error") ? "failed" : "completed",
    results: artifact.steps.map((step) => ({
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
    })),
  };
}

export function buildRuntimeVariablesFromArtifact(
  artifact: PersistedExecutionArtifact,
  aliases?: string[]
): Record<string, unknown> {
  const activeAliases = aliases ?? Object.keys(artifact.stepContextByAlias);
  return Object.fromEntries(
    activeAliases
      .map((alias) => artifact.stepContextByAlias[alias])
      .filter((context): context is PersistedStepContext => Boolean(context))
      .map((context) => [context.alias, cloneValue(context.payload)])
  );
}

export function buildSnapshotsFromArtifact(artifact: PersistedExecutionArtifact): StepSnapshot[] {
  const runtimeVariables = buildRuntimeVariablesFromArtifact(artifact);

  return artifact.steps.map((step, index) => ({
    stepId: step.stepId,
    stepName: step.stepName,
    entryType: "request",
    method: step.method,
    url: step.url,
    resolvedRequest: {
      url: step.resolvedRequestSummary.url,
      headers: step.resolvedRequestSummary.headers,
      body: step.resolvedRequestSummary.bodyPreview,
    },
    status: step.status,
    reducedResponse: step.reducedResponse,
    fullHeaders: step.reducedResponse?.headers,
    variables: index === artifact.steps.length - 1 ? runtimeVariables : runtimeVariables,
    error: step.error,
    startedAt: step.completedAt,
    completedAt: step.completedAt,
  }));
}

export function isArtifactStale(artifact: PersistedExecutionArtifact, pipeline: Pipeline) {
  const tooOld = Date.now() - new Date(artifact.generatedAt).getTime() > STALE_WINDOW_MS;
  const structureChanged = artifact.pipelineStructureHash !== buildPipelineStructureHash(pipeline);
  return tooOld || structureChanged;
}

export function getRequiredPreviousAliases(
  pipeline: Pipeline,
  startStepId: string,
  aliases: StepAlias[],
  collectDependencies: (step: Pipeline["steps"][number]) => Array<{ alias: string }>
) {
  const startIndex = pipeline.steps.findIndex((step) => step.id === startStepId);
  if (startIndex === -1) return [];

  const allowedAliases = new Set(aliases.slice(0, startIndex).map((alias) => alias.alias));
  return [
    ...new Set(
      pipeline.steps
        .slice(startIndex)
        .flatMap((step) => collectDependencies(step).map((dependency) => dependency.alias))
        .filter((alias) => allowedAliases.has(alias))
    ),
  ];
}

export function buildPipelineStructureHash(pipeline: Pipeline) {
  const raw = JSON.stringify(
    pipeline.steps.map((step) => ({
      id: step.id,
      method: step.method,
      url: step.url,
      headers: step.headers.map(({ key, value, enabled }) => ({ key, value, enabled })),
      params: step.params.map(({ key, value, enabled }) => ({ key, value, enabled })),
      body: step.body,
      bodyType: step.bodyType,
    }))
  );

  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return `pipeline_${(hash >>> 0).toString(16)}`;
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
      bodyPreview: snapshot.resolvedRequest.body?.slice(0, MAX_BODY_PREVIEW) ?? null,
    },
    error: snapshot.error,
    completedAt: snapshot.completedAt,
  };
}

function buildStepContext(alias: string, snapshot: StepSnapshot): PersistedStepContext {
  return {
    stepId: snapshot.stepId,
    alias,
    payload: {
      response: {
        status: snapshot.reducedResponse?.status ?? null,
        statusText: snapshot.reducedResponse?.statusText ?? "",
        time: snapshot.reducedResponse?.latencyMs ?? 0,
        size: snapshot.reducedResponse?.sizeBytes ?? 0,
        headers: cloneValue(snapshot.fullHeaders ?? snapshot.reducedResponse?.headers ?? {}),
        body: parseResponseBody(snapshot.fullBody),
      },
    },
  };
}

function parseResponseBody(fullBody?: string) {
  if (!fullBody) return {};
  try {
    return JSON.parse(fullBody) as Record<string, unknown>;
  } catch {
    return { raw: fullBody.slice(0, MAX_BODY_PREVIEW) };
  }
}

function buildContextByAlias(
  aliases: StepAlias[],
  runtimeVariables: Record<string, unknown>,
  snapshots: StepSnapshot[]
) {
  const snapshotByAlias = new Map(
    snapshots
      .filter((snapshot) => snapshot.status === "success")
      .map((snapshot) => [snapshot.stepId, snapshot] as const)
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
              payload: cloneValue(runtimeValue as Record<string, unknown>),
            } satisfies PersistedStepContext,
          ];
        }

        const snapshot = snapshotByAlias.get(alias.stepId);
        if (!snapshot) return null;
        return [alias.alias, buildStepContext(alias.alias, snapshot)] as const;
      })
      .filter((entry): entry is [string, PersistedStepContext] => Boolean(entry))
  );
}

function cloneValue<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
