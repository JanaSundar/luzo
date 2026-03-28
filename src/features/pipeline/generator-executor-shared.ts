import type { executeRequest } from "@/app/actions/api-tests";
import type { PipelineStep } from "@/types";
import type { GeneratorYield, StepAbortControl, StepSnapshot } from "@/types/pipeline-runtime";
import { reduceResponse } from "./context-reducer";
import {
  toErrorMessage,
  toPostRequestResult,
  toPreRequestResult,
  toStepStatus,
  toTestResult,
} from "./pipeline-execution-mappers";
import { cloneSnapshot, cloneSnapshots, createCompletedSnapshot } from "./pipeline-snapshot-utils";
import { resolveTemplate } from "./variable-resolver";

export const DEFAULT_STEP_TIMEOUT_MS = 30_000;
const MAX_STREAM_CHUNKS = 200;

export type NormalizedResponse = Awaited<ReturnType<typeof executeRequest>>;

export interface GeneratorOptions {
  stepTimeoutMs?: number;
  abortControls: Map<string, StepAbortControl>;
  masterAbort: AbortController;
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
  const resolvedAuth =
    step.auth.type === "bearer" && step.auth.bearer
      ? { ...step.auth, bearer: { token: resolve(step.auth.bearer.token ?? "") } }
      : step.auth.type === "basic" && step.auth.basic
        ? {
            ...step.auth,
            basic: {
              username: resolve(step.auth.basic.username ?? ""),
              password: resolve(step.auth.basic.password ?? ""),
            },
          }
        : step.auth.type === "api-key" && step.auth.apiKey
          ? {
              ...step.auth,
              apiKey: {
                ...step.auth.apiKey,
                key: resolve(step.auth.apiKey.key ?? ""),
                value: resolve(step.auth.apiKey.value ?? ""),
              },
            }
          : step.auth.type === "oauth2" && step.auth.oauth2
            ? { ...step.auth, oauth2: { accessToken: resolve(step.auth.oauth2.accessToken ?? "") } }
            : step.auth.type === "aws-sigv4" && step.auth.awsSigv4
              ? {
                  ...step.auth,
                  awsSigv4: {
                    accessKey: resolve(step.auth.awsSigv4.accessKey ?? ""),
                    secretKey: resolve(step.auth.awsSigv4.secretKey ?? ""),
                    region: resolve(step.auth.awsSigv4.region ?? ""),
                    service: resolve(step.auth.awsSigv4.service ?? ""),
                  },
                }
              : step.auth;

  return {
    ...step,
    url: resolve(step.url),
    headers: step.headers.map((h) => ({ ...h, key: resolve(h.key), value: resolve(h.value) })),
    params: step.params.map((p) => ({ ...p, key: resolve(p.key), value: resolve(p.value) })),
    body: step.body ? resolve(step.body) : step.body,
    auth: resolvedAuth,
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

export function buildYield(
  type: GeneratorYield["type"],
  snapshot: StepSnapshot,
  snapshots: StepSnapshot[],
) {
  return {
    type,
    snapshot: cloneSnapshot(snapshot),
    allSnapshots: cloneSnapshots(snapshots),
  } satisfies GeneratorYield;
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
  pendingSnapshot.streamStatus = "done";
  return createCompletedSnapshot(
    pendingSnapshot,
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
