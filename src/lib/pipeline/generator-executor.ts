import { executeRequest } from "@/app/actions/api-tests";
import {
  type StreamChunk,
  type StreamResult,
  executeRequestStream as executeStream,
} from "@/lib/http/client";
import type { Pipeline, PipelineStep } from "@/types";
import type { GeneratorYield, StepAbortControl, StepSnapshot } from "@/types/pipeline-runtime";
import { reduceResponse } from "./context-reducer";
import { buildStepAliases, validatePipelineDag } from "./dag-validator";
import {
  toErrorMessage,
  toPreRequestResult,
  toRuntimeValue,
  toStepStatus,
  toTestResult,
} from "./pipeline-execution-mappers";
import {
  cloneSnapshot,
  cloneSnapshots,
  createCompletedSnapshot,
  createInitialSnapshot,
} from "./pipeline-snapshot-utils";
import { resolveTemplate } from "./variable-resolver";

const DEFAULT_STEP_TIMEOUT_MS = 30_000;
const MAX_STREAM_CHUNKS = 200;

export type GeneratorExecutorModule = typeof import("./generator-executor");

type NormalizedResponse = Awaited<ReturnType<typeof executeRequest>>;

interface GeneratorOptions {
  stepTimeoutMs?: number;
  abortControls: Map<string, StepAbortControl>;
  masterAbort: AbortController;
  startStepId?: string;
  initialRuntimeVariables?: Record<string, unknown>;
  useStream?: boolean;
}

interface ResolvedRequest {
  method: PipelineStep["method"];
  url: string;
  headers: Record<string, string>;
  body: string | null;
}

function cloneRuntimeVariables(value?: Record<string, unknown>): Record<string, unknown> {
  if (!value) return {};
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as Record<string, unknown>);
}

export function limitStreamChunks(chunks: string[]): string[] {
  return chunks.length <= MAX_STREAM_CHUNKS ? chunks : chunks.slice(-MAX_STREAM_CHUNKS);
}

function extractHighlightPath(body?: string): string | undefined {
  if (!body) return undefined;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const priorityKeys = ["error", "message", "detail", "msg", "reason"];
    return priorityKeys.find((k) => k in parsed);
  } catch {
    return undefined;
  }
}

function normalizeStreamResult(res: StreamResult): NormalizedResponse {
  return { ...res };
}

function resolveStep(
  step: PipelineStep,
  runtimeVars: Record<string, unknown>,
  envVars: Record<string, string>,
  variableOverrides: Record<string, string>,
): PipelineStep {
  const resolve = (value: string) =>
    resolveTemplate(value, runtimeVars, envVars, variableOverrides);

  return {
    ...step,
    url: resolve(step.url),
    headers: step.headers.map((h) => ({ ...h, key: resolve(h.key), value: resolve(h.value) })),
    params: step.params.map((p) => ({ ...p, key: resolve(p.key), value: resolve(p.value) })),
    body: step.body ? resolve(step.body) : step.body,
  };
}

function buildResolvedRequest(resolvedStep: PipelineStep): ResolvedRequest {
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

function buildYield(
  type: GeneratorYield["type"],
  snapshot: StepSnapshot,
  snapshots: StepSnapshot[],
): GeneratorYield {
  return {
    type,
    snapshot: cloneSnapshot(snapshot),
    allSnapshots: cloneSnapshots(snapshots),
  } satisfies GeneratorYield;
}

function createStepAbort(
  stepId: string,
  stepTimeoutMs: number,
  abortControls: Map<string, StepAbortControl>,
): StepAbortControl {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), stepTimeoutMs);
  const control: StepAbortControl = { controller, timeoutId };
  abortControls.set(stepId, control);
  return control;
}

function clearStepAbort(
  stepId: string,
  control: StepAbortControl,
  abortControls: Map<string, StepAbortControl>,
  masterAbort: AbortController,
  onMasterAbort: () => void,
): void {
  clearTimeout(control.timeoutId);
  abortControls.delete(stepId);
  masterAbort.signal.removeEventListener("abort", onMasterAbort);
}

function isAborted(stepAbort: StepAbortControl, masterAbort: AbortController): boolean {
  return stepAbort.controller.signal.aborted || masterAbort.signal.aborted;
}

function buildAbortedSnapshot(
  pendingSnapshot: StepSnapshot,
  runtimeVariables: Record<string, unknown>,
  resolvedRequest: ResolvedRequest,
  response?: NormalizedResponse | StreamResult,
): StepSnapshot {
  const snap = createCompletedSnapshot(
    pendingSnapshot,
    "error",
    null,
    runtimeVariables,
    "Request aborted",
    resolvedRequest,
    undefined,
    undefined,
    { body: response?.body ?? "", headers: response?.headers ?? {} },
    "error",
  );
  snap.highlightPath = extractHighlightPath(response?.body);
  return snap;
}

function buildSuccessSnapshot(
  pendingSnapshot: StepSnapshot,
  resolvedResponse: NormalizedResponse,
  runtimeVariables: Record<string, unknown>,
  resolvedRequest: ResolvedRequest,
): StepSnapshot {
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
    toTestResult(resolvedResponse),
    { body: resolvedResponse.body, headers: resolvedResponse.headers },
    "done",
  );
}

function buildFailedSnapshot(
  pendingSnapshot: StepSnapshot,
  runtimeVariables: Record<string, unknown>,
  error: unknown,
  aborted: boolean,
): StepSnapshot {
  const snap = createCompletedSnapshot(
    pendingSnapshot,
    "error",
    null,
    runtimeVariables,
    aborted ? "Request aborted" : toErrorMessage(error),
    undefined,
    undefined,
    undefined,
    undefined,
    "error",
  );
  snap.highlightPath = extractHighlightPath((error as Error)?.message);
  return snap;
}

async function* runStreamExecution(
  resolvedStep: PipelineStep,
  envVariables: Record<string, string>,
  pendingSnapshot: StepSnapshot,
  snapshots: StepSnapshot[],
  stepAbort: StepAbortControl,
  masterAbort: AbortController,
): AsyncGenerator<GeneratorYield, StreamResult, Record<string, string> | undefined> {
  pendingSnapshot.streamStatus = "streaming";
  pendingSnapshot.streamChunks = [];

  const stream = executeStream(resolvedStep, envVariables, {
    abortSignal: stepAbort.controller.signal,
  });

  let next = await stream.next();

  while (!next.done) {
    if (isAborted(stepAbort, masterAbort)) {
      throw new Error("Request aborted");
    }

    const { chunk } = next.value as StreamChunk;
    pendingSnapshot.streamChunks = limitStreamChunks([...pendingSnapshot.streamChunks, chunk]);

    yield {
      type: "stream_chunk",
      snapshot: cloneSnapshot(pendingSnapshot),
      allSnapshots: cloneSnapshots(snapshots),
    };

    next = await stream.next();
  }

  return next.value as StreamResult;
}

async function* executeStepGenerator(
  step: PipelineStep,
  stepIndex: number,
  alias: string,
  runtimeVariables: Record<string, unknown>,
  envVariables: Record<string, string>,
  snapshots: StepSnapshot[],
  isLastStep: boolean,
  options: GeneratorOptions,
): AsyncGenerator<GeneratorYield, void, Record<string, string> | undefined> {
  const { stepTimeoutMs = DEFAULT_STEP_TIMEOUT_MS, abortControls, masterAbort } = options;

  // --- Setup pending snapshot and pause for the controller ---
  const pendingSnapshot = createInitialSnapshot(step, stepIndex, "running", runtimeVariables, null);
  pendingSnapshot.startedAt = Date.now();
  pendingSnapshot.streamStatus = "idle";
  pendingSnapshot.streamChunks = [];
  snapshots.push(pendingSnapshot);

  const variableOverrides = (yield buildYield("step_ready", pendingSnapshot, snapshots)) as
    | Record<string, string>
    | undefined;

  // --- Normal / stream execution path ---
  const stepAbort = createStepAbort(step.id, stepTimeoutMs, abortControls);
  const onMasterAbort = () => stepAbort.controller.abort();
  masterAbort.signal.addEventListener("abort", onMasterAbort, { once: true });

  try {
    const resolvedStep = resolveStep(step, runtimeVariables, envVariables, variableOverrides ?? {});
    const resolvedRequest = buildResolvedRequest(resolvedStep);

    let resolvedResponse: NormalizedResponse;

    if (options.useStream) {
      const rawResponse = yield* runStreamExecution(
        resolvedStep,
        envVariables,
        pendingSnapshot,
        snapshots,
        stepAbort,
        masterAbort,
      );
      resolvedResponse = normalizeStreamResult(rawResponse);
    } else {
      resolvedResponse = await executeRequest(resolvedStep, envVariables);
    }

    clearStepAbort(step.id, stepAbort, abortControls, masterAbort, onMasterAbort);

    if (isAborted(stepAbort, masterAbort)) {
      const abortedSnapshot = buildAbortedSnapshot(
        pendingSnapshot,
        runtimeVariables,
        resolvedRequest,
        resolvedResponse,
      );
      snapshots[snapshots.length - 1] = abortedSnapshot;
      yield buildYield("step_complete", abortedSnapshot, snapshots);
      return;
    }

    runtimeVariables[alias] = toRuntimeValue(resolvedResponse);

    const completedSnapshot = buildSuccessSnapshot(
      pendingSnapshot,
      resolvedResponse,
      runtimeVariables,
      resolvedRequest,
    );
    snapshots[snapshots.length - 1] = completedSnapshot;

    yield buildYield("step_complete", completedSnapshot, snapshots);
    if (isLastStep) return;
  } catch (error) {
    clearStepAbort(step.id, stepAbort, abortControls, masterAbort, onMasterAbort);

    const aborted = isAborted(stepAbort, masterAbort);
    const failedSnapshot = buildFailedSnapshot(pendingSnapshot, runtimeVariables, error, aborted);
    snapshots[snapshots.length - 1] = failedSnapshot;

    yield buildYield("step_complete", failedSnapshot, snapshots);

    if (!aborted) {
      yield buildYield("error", failedSnapshot, snapshots);
    }
  }
}

function buildAbortResult(
  step: PipelineStep,
  stepIndex: number,
  runtimeVariables: Record<string, unknown>,
  snapshots: StepSnapshot[],
): GeneratorYield {
  const snapshot = createInitialSnapshot(
    step,
    stepIndex,
    "error",
    runtimeVariables,
    "Pipeline aborted",
  );
  snapshot.streamStatus = "error";
  snapshot.streamChunks = [];
  snapshots.push(snapshot);
  return buildYield("error", snapshot, snapshots);
}

export async function* createPipelineGenerator(
  pipeline: Pipeline,
  envVariables: Record<string, string>,
  options: GeneratorOptions,
): AsyncGenerator<GeneratorYield, void, Record<string, string> | undefined> {
  const { masterAbort } = options;

  const validation = validatePipelineDag(pipeline.steps);
  if (!validation.valid || !validation.sortedStepIds) return;

  const startIndex = options.startStepId
    ? validation.sortedStepIds.indexOf(options.startStepId)
    : 0;

  if (options.startStepId && startIndex === -1) {
    throw new Error("Invalid startStepId");
  }

  const stepsToRun = validation.sortedStepIds.slice(startIndex);
  const stepMap = new Map(pipeline.steps.map((s) => [s.id, s]));
  const aliasMap = new Map(buildStepAliases(pipeline.steps).map((a) => [a.stepId, a.alias]));

  const snapshots: StepSnapshot[] = [];
  const runtimeVariables = cloneRuntimeVariables(options.initialRuntimeVariables);

  for (let i = 0; i < stepsToRun.length; i++) {
    const stepId = stepsToRun[i];
    const step = stepMap.get(stepId);
    if (!step) continue;

    if (masterAbort.signal.aborted) {
      yield buildAbortResult(step, startIndex + i, runtimeVariables, snapshots);
      return;
    }

    const alias = aliasMap.get(step.id) ?? "reqUnknown";
    const isLastStep = i === stepsToRun.length - 1;

    yield* executeStepGenerator(
      step,
      startIndex + i,
      alias,
      runtimeVariables,
      envVariables,
      snapshots,
      isLastStep,
      options,
    );
  }
}
