import type { ApiResponse, PipelineStep } from "@/types";
import type {
  EntryType,
  ReducedResponse,
  ScriptResult,
  StepSnapshot,
  StepStatus,
} from "@/types/pipeline-debug";
import { reduceResponse } from "./context-reducer";

export function cloneSnapshots(snapshots: StepSnapshot[]): StepSnapshot[] {
  return snapshots.map((snapshot) => cloneSnapshot(snapshot));
}

export function cloneSnapshot(snapshot: StepSnapshot): StepSnapshot {
  return {
    ...snapshot,
    variables: { ...snapshot.variables },
    resolvedRequest: {
      ...snapshot.resolvedRequest,
      headers: { ...snapshot.resolvedRequest.headers },
    },
  };
}

export function createInitialSnapshot(
  step: PipelineStep,
  status: StepStatus,
  variables: Record<string, unknown>,
  error: string | null,
  entryType: EntryType = "request"
): StepSnapshot {
  return {
    stepId: step.id,
    stepName: step.name,
    entryType,
    method: step.method,
    url: step.url,
    resolvedRequest: { url: step.url, headers: {}, body: step.body },
    status,
    reducedResponse: null,
    variables: { ...variables },
    error,
    startedAt: null,
    completedAt: null,
  };
}

export function createCompletedSnapshot(
  base: StepSnapshot,
  status: StepStatus,
  reduced: ReducedResponse | null,
  variables: Record<string, unknown>,
  error: string | null,
  resolvedRequest?: StepSnapshot["resolvedRequest"],
  preRequestResult?: ScriptResult,
  testResult?: ScriptResult,
  fullResponse?: { body: string; headers: Record<string, string> }
): StepSnapshot {
  return {
    ...base,
    ...(resolvedRequest && { resolvedRequest }),
    status,
    reducedResponse: reduced,
    variables: { ...variables },
    error,
    completedAt: new Date().toISOString(),
    preRequestResult,
    testResult,
    ...(fullResponse && {
      fullBody: fullResponse.body,
      fullHeaders: fullResponse.headers,
    }),
  };
}

export function resultToSnapshots(
  results: Array<ApiResponse & { stepId: string; stepName: string; method: string; url: string }>
): StepSnapshot[] {
  return results.map((result) => ({
    stepId: result.stepId,
    stepName: result.stepName,
    entryType: "request",
    method: result.method as PipelineStep["method"],
    url: result.url,
    resolvedRequest: { url: result.url, headers: {}, body: null },
    status: result.status >= 200 && result.status < 400 ? "success" : "error",
    reducedResponse: reduceResponse(result),
    variables: {},
    error: result.status >= 400 ? `HTTP ${result.status} ${result.statusText}` : null,
    startedAt: null,
    completedAt: null,
  }));
}
