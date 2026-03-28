import type { executeRequest } from "@/app/actions/api-tests";
import type { PipelineStep } from "@/types";
import type { CompiledPipelinePlan } from "@/types/workflow";
import type {
  PipelineExecutionEvent,
  StepAbortControl,
  StepSnapshot,
} from "@/types/pipeline-runtime";
import { reduceResponse } from "./context-reducer";
import {
  toErrorMessage,
  toPostRequestResult,
  toPreRequestResult,
  toStepStatus,
  toTestResult,
} from "./pipeline-execution-mappers";
import { cloneSnapshot, createCompletedSnapshot } from "./pipeline-snapshot-utils";
import { resolveStepAuth } from "./resolve-step-auth";
import { resolveTemplate } from "./variable-resolver";

export const DEFAULT_STEP_TIMEOUT_MS = 30_000;
const MAX_STREAM_CHUNKS = 200;

export type NormalizedResponse = Awaited<ReturnType<typeof executeRequest>>;

export interface GeneratorOptions {
  stepTimeoutMs?: number;
  abortControls: Map<string, StepAbortControl>;
  masterAbort: AbortController;
  compiledPlan?: CompiledPipelinePlan;
  startStepId?: string;
  initialRuntimeVariables?: Record<string, unknown>;
  useStream?: boolean;
}

export interface ResolvedRequest {
  method: PipelineStep["method"];
  url: string;
  headers: Record<string, string>;
  body: string | null;
}

export function cloneRuntimeVariables(value?: Record<string, unknown>) {
  if (!value) return {};
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as Record<string, unknown>);
}

export function limitStreamChunks(chunks: string[]) {
  return chunks.length <= MAX_STREAM_CHUNKS ? chunks : chunks.slice(-MAX_STREAM_CHUNKS);
}

export function resolveStep(
  step: PipelineStep,
  runtimeVars: Record<string, unknown>,
  envVars: Record<string, string>,
  variableOverrides: Record<string, string>,
) {
  const resolve = (value: string) =>
    resolveTemplate(value, runtimeVars, envVars, variableOverrides);

  return {
    ...step,
    url: resolve(step.url),
    headers: step.headers.map((h) => ({ ...h, key: resolve(h.key), value: resolve(h.value) })),
    params: step.params.map((p) => ({ ...p, key: resolve(p.key), value: resolve(p.value) })),
    body: step.body ? resolve(step.body) : step.body,
    auth: resolveStepAuth(step, resolve),
  };
}

export function buildResolvedRequest(resolvedStep: PipelineStep): ResolvedRequest {
  const queryParams = resolvedStep.params
    .filter((p) => p.enabled && p.key)
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join("&");

  return {
    method: resolvedStep.method,
    url: queryParams ? `${resolvedStep.url}?${queryParams}` : resolvedStep.url,
    headers: resolvedStep.headers.reduce<Record<string, string>>((acc, h) => {
      if (h.enabled && h.key) acc[h.key] = h.value;
      return acc;
    }, {}),
    body: resolvedStep.body,
  };
}

export function buildExecutionEvent(
  type: Extract<
    PipelineExecutionEvent["type"],
    "step_ready" | "step_stream_chunk" | "step_completed" | "step_failed"
  >,
  snapshot: StepSnapshot,
  runtimeVariables?: Record<string, unknown>,
  chunk?: string,
) {
  const snapshotCopy = cloneSnapshot(snapshot);

  if (type === "step_stream_chunk") {
    return {
      type,
      snapshot: snapshotCopy,
      chunk: chunk ?? "",
    } satisfies PipelineExecutionEvent;
  }

  if (type === "step_completed" || type === "step_failed") {
    return {
      type,
      snapshot: snapshotCopy,
      runtimeVariables: cloneRuntimeVariables(runtimeVariables ?? {}),
    } satisfies PipelineExecutionEvent;
  }

  return {
    type,
    snapshot: snapshotCopy,
  } satisfies PipelineExecutionEvent;
}

export function createStepAbort(
  stepId: string,
  stepTimeoutMs: number,
  abortControls: Map<string, StepAbortControl>,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), stepTimeoutMs);
  const control: StepAbortControl = { controller, timeoutId };
  abortControls.set(stepId, control);
  return control;
}

export function clearStepAbort(
  stepId: string,
  control: StepAbortControl,
  abortControls: Map<string, StepAbortControl>,
  masterAbort: AbortController,
  onMasterAbort: () => void,
) {
  clearTimeout(control.timeoutId);
  abortControls.delete(stepId);
  masterAbort.signal.removeEventListener("abort", onMasterAbort);
}

export function isAborted(stepAbort: StepAbortControl, masterAbort: AbortController) {
  return stepAbort.controller.signal.aborted || masterAbort.signal.aborted;
}

export function buildAbortedSnapshot(
  pendingSnapshot: StepSnapshot,
  runtimeVariables: Record<string, unknown>,
  resolvedRequest: ResolvedRequest,
  response?: NormalizedResponse,
) {
  return createErrorSnapshot(
    pendingSnapshot,
    runtimeVariables,
    "Request aborted",
    resolvedRequest,
    response ? { body: response.body, headers: response.headers } : undefined,
  );
}

export function buildSuccessSnapshot(
  pendingSnapshot: StepSnapshot,
  resolvedResponse: NormalizedResponse,
  runtimeVariables: Record<string, unknown>,
  resolvedRequest: ResolvedRequest,
) {
  const stepStatus = toStepStatus(resolvedResponse.status);
  return createCompletedSnapshot(
    {
      ...pendingSnapshot,
      streamStatus: "done",
    },
    stepStatus,
    reduceResponse(resolvedResponse),
    runtimeVariables,
    stepStatus === "error"
      ? `HTTP ${resolvedResponse.status} ${resolvedResponse.statusText}`
      : null,
    resolvedRequest,
    toPreRequestResult(resolvedResponse),
    toPostRequestResult(resolvedResponse),
    toTestResult(resolvedResponse),
    { body: resolvedResponse.body, headers: resolvedResponse.headers },
    "done",
  );
}

export function buildFailedSnapshot(
  pendingSnapshot: StepSnapshot,
  runtimeVariables: Record<string, unknown>,
  error: unknown,
  aborted: boolean,
) {
  return createErrorSnapshot(
    pendingSnapshot,
    runtimeVariables,
    aborted ? "Request aborted" : toErrorMessage(error),
  );
}

function createErrorSnapshot(
  pendingSnapshot: StepSnapshot,
  runtimeVariables: Record<string, unknown>,
  error: string,
  resolvedRequest?: ResolvedRequest,
  fullResponse?: { body: string; headers: Record<string, string> },
) {
  const snapshot = createCompletedSnapshot(
    pendingSnapshot,
    "error",
    null,
    runtimeVariables,
    error,
    resolvedRequest,
    undefined,
    undefined,
    undefined,
    fullResponse,
    "error",
  );
  snapshot.highlightPath = extractHighlightPath(fullResponse?.body ?? error);
  return snapshot;
}

function extractHighlightPath(body?: string) {
  if (!body) return undefined;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    return ["error", "message", "detail", "msg", "reason"].find((key) => key in parsed);
  } catch {
    return undefined;
  }
}
