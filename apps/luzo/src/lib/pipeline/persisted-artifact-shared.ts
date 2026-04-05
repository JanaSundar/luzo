import type { Pipeline } from "@/types";
import type {
  PersistedStepArtifact,
  PersistedStepContext,
  StepAlias,
  StepSnapshot,
} from "@/types/pipeline-debug";

export const PERSISTED_BODY_PREVIEW_MAX = 400;

export function cloneSerializableValue<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export function parsePersistedResponseBody(
  fullBody?: string,
  previewMax = PERSISTED_BODY_PREVIEW_MAX,
) {
  if (!fullBody) return {};
  try {
    return JSON.parse(fullBody) as Record<string, unknown>;
  } catch {
    return { raw: fullBody.slice(0, previewMax) };
  }
}

export function toPersistedStepArtifact(
  snapshot: StepSnapshot,
  alias: string,
  previewMax = PERSISTED_BODY_PREVIEW_MAX,
): PersistedStepArtifact {
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
      bodyPreview: snapshot.resolvedRequest.body?.slice(0, previewMax) ?? null,
    },
    error: snapshot.error,
    completedAt: snapshot.completedAt != null ? new Date(snapshot.completedAt).toISOString() : null,
  };
}

export function buildStepContextByAlias(
  aliases: StepAlias[],
  runtimeVariables: Record<string, unknown>,
  snapshots: StepSnapshot[],
  previewMax = PERSISTED_BODY_PREVIEW_MAX,
) {
  const snapshotByStepId = new Map(
    snapshots
      .filter((snapshot) => snapshot.status === "success")
      .map((snapshot) => [snapshot.stepId, snapshot] as const),
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
              payload: cloneSerializableValue(runtimeValue as Record<string, unknown>),
            } satisfies PersistedStepContext,
          ];
        }

        const snapshot = snapshotByStepId.get(alias.stepId);
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
                headers: cloneSerializableValue(
                  snapshot.fullHeaders ?? snapshot.reducedResponse?.headers ?? {},
                ),
                body: parsePersistedResponseBody(snapshot.fullBody, previewMax),
              },
            },
          } satisfies PersistedStepContext,
        ] as const;
      })
      .filter((entry): entry is [string, PersistedStepContext] => entry !== null),
  );
}

export function buildPipelineStepHash(
  pipeline: Pipeline,
  projectStep: (step: Pipeline["steps"][number]) => unknown,
) {
  const raw = JSON.stringify(pipeline.steps.map(projectStep));
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return `pipeline_${(hash >>> 0).toString(16)}`;
}
