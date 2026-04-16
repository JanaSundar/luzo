import type { Pipeline } from "@/types";
import type {
  PersistedStepArtifact,
  PersistedStepContext,
  StepAlias,
  StepSnapshot,
} from "@/types/pipeline-debug";

const MAX_BODY_PREVIEW = 400;

export function cloneValue<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
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
    })),
  );

  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return `pipeline_${(hash >>> 0).toString(16)}`;
}

export function toStepArtifact(snapshot: StepSnapshot, alias: string): PersistedStepArtifact {
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
    completedAt:
      snapshot.completedAt !== null ? new Date(snapshot.completedAt).toISOString() : null,
    preRequestPassed:
      snapshot.preRequestResult != null
        ? snapshot.preRequestResult.status === "success" && !snapshot.preRequestResult.error
        : null,
    postRequestPassed:
      snapshot.postRequestResult != null
        ? snapshot.postRequestResult.status === "success" && !snapshot.postRequestResult.error
        : null,
    testsPassed:
      snapshot.testResult != null
        ? snapshot.testResult.status === "success" && !snapshot.testResult.error
        : null,
  };
}

export function parseResponseBody(fullBody?: string) {
  if (!fullBody) return {};
  try {
    return JSON.parse(fullBody) as Record<string, unknown>;
  } catch {
    return { raw: fullBody.slice(0, MAX_BODY_PREVIEW) };
  }
}

export function tryParseJson(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

export function buildStepContext(alias: string, snapshot: StepSnapshot): PersistedStepContext {
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

export function buildContextByAlias(
  aliases: StepAlias[],
  runtimeVariables: Record<string, unknown>,
  snapshots: StepSnapshot[],
) {
  const snapshotByAlias = new Map(
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
              payload: cloneValue(runtimeValue as Record<string, unknown>),
            } satisfies PersistedStepContext,
          ];
        }

        const snapshot = snapshotByAlias.get(alias.stepId);
        if (!snapshot) return null;
        return [alias.alias, buildStepContext(alias.alias, snapshot)] as const;
      })
      .filter((entry): entry is [string, PersistedStepContext] => Boolean(entry)),
  );
}
