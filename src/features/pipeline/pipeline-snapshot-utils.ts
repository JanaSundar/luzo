import type { ApiResponse, PipelineStep } from "@/types";
import type {
  EntryType,
  ReducedResponse,
  ScriptResult,
  StepSnapshot,
  StepStatus,
  StreamStatus,
} from "@/types/pipeline-runtime";
import { reduceResponse } from "./context-reducer";

export function cloneSnapshots(snapshots: StepSnapshot[]): StepSnapshot[] {
  return snapshots.map(cloneSnapshot);
}

export function cloneSnapshot(snapshot: StepSnapshot): StepSnapshot {
  if (typeof structuredClone === "function") {
    return structuredClone(snapshot);
  }
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
  stepIndex: number,
  status: StepStatus,
  variables: Record<string, unknown>,
  error: string | null,
  entryType: EntryType = "request",
  streamStatus: StreamStatus = "idle",
): StepSnapshot {
  return {
    stepId: step.id,
    stepIndex,
    stepName: step.name,
    entryType,
    method: step.method,
    url: step.url,
    resolvedRequest: { method: step.method, url: step.url, headers: {}, body: step.body },
    status,
    reducedResponse: null,
    variables: { ...variables },
    error,
    startedAt: null,
    completedAt: null,
    streamStatus,
    streamChunks: [],
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
  fullResponse?: { body: string; headers: Record<string, string> },
  streamStatus: StreamStatus = "done",
): StepSnapshot {
  return {
    ...base,
    ...(resolvedRequest && { resolvedRequest }),
    status,
    reducedResponse: reduced,
    variables: { ...variables },
    error,
    completedAt: Date.now(),
    preRequestResult,
    testResult,
    ...(fullResponse && {
      fullBody: fullResponse.body,
      fullHeaders: fullResponse.headers,
    }),
    streamStatus,
    streamChunks: base.streamChunks,
  };
}

export function resultToSnapshots(
  results: Array<ApiResponse & { stepId: string; stepName: string; method: string; url: string }>,
): StepSnapshot[] {
  return results.map((result, i) => ({
    stepId: result.stepId,
    stepIndex: i,
    stepName: result.stepName,
    entryType: "request" as EntryType,
    method: result.method as PipelineStep["method"],
    url: result.url,
    resolvedRequest: {
      method: result.method as PipelineStep["method"],
      url: result.url,
      headers: {},
      body: null,
    },
    status: (result.status >= 200 && result.status < 400 ? "success" : "error") as StepStatus,
    reducedResponse: reduceResponse(result),
    variables: {},
    error: result.status >= 400 ? `HTTP ${result.status} ${result.statusText}` : null,
    startedAt: null,
    completedAt: null,
    streamStatus: "done" as StreamStatus,
    streamChunks: [],
  }));
}
