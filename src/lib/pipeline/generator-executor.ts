import { executeRequest } from "@/app/actions/api-tests";
import {
  executeRequestStream as executeStream,
  type StreamChunk,
  type StreamResult,
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

function normalizeStreamResult(res: StreamResult): NormalizedResponse {
  return {
    ...res,
  };
}

interface GeneratorOptions {
  stepTimeoutMs?: number;
  abortControls: Map<string, StepAbortControl>;
  masterAbort: AbortController;
  startStepId?: string;
  initialRuntimeVariables?: Record<string, unknown>;
  useStream?: boolean;
}

export async function* createPipelineGenerator(
  pipeline: Pipeline,
  envVariables: Record<string, string>,
  options: GeneratorOptions
): AsyncGenerator<GeneratorYield, void, Record<string, string> | undefined> {
  const { stepTimeoutMs = DEFAULT_STEP_TIMEOUT_MS, abortControls, masterAbort } = options;

  const validation = validatePipelineDag(pipeline.steps);
  if (!validation.valid || !validation.sortedStepIds) {
    return;
  }

  const startIndex = options.startStepId
    ? validation.sortedStepIds.indexOf(options.startStepId)
    : 0;
  if (options.startStepId && startIndex === -1) {
    throw new Error("Invalid startStepId");
  }

  const stepsToRun = validation.sortedStepIds.slice(startIndex);
  const stepMap = new Map(pipeline.steps.map((s) => [s.id, s]));
  const aliases = buildStepAliases(pipeline.steps);
  const aliasMap = new Map(aliases.map((alias) => [alias.stepId, alias.alias]));

  const snapshots: StepSnapshot[] = [];
  const runtimeVariables = cloneRuntimeVariables(options.initialRuntimeVariables);
  let stepIndex = startIndex;

  for (const stepId of stepsToRun) {
    const step = stepMap.get(stepId);
    if (!step) continue;

    const alias = aliasMap.get(step.id) ?? "reqUnknown";

    if (masterAbort.signal.aborted) {
      yield buildAbortResult(step, stepIndex, runtimeVariables, snapshots);
      return;
    }

    const pendingSnapshot = createInitialSnapshot(
      step,
      stepIndex,
      "running",
      runtimeVariables,
      null
    );
    pendingSnapshot.startedAt = Date.now();
    pendingSnapshot.streamStatus = "idle";
    pendingSnapshot.streamChunks = [];
    snapshots.push(pendingSnapshot);

    const variableOverrides = (yield {
      type: "step_ready",
      snapshot: cloneSnapshot(pendingSnapshot),
      allSnapshots: cloneSnapshots(snapshots),
    }) as Record<string, string> | undefined;

    const stepAbort = createStepAbort(step.id, stepTimeoutMs, abortControls);
    const onMasterAbort = () => stepAbort.controller.abort();
    masterAbort.signal.addEventListener("abort", onMasterAbort, { once: true });

    try {
      const resolvedStep = resolveStep(
        step,
        runtimeVariables,
        envVariables,
        variableOverrides ?? {}
      );
      const queryParams = resolvedStep.params
        .filter((p) => p.enabled && p.key)
        .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join("&");

      const fullUrl = queryParams ? `${resolvedStep.url}?${queryParams}` : resolvedStep.url;

      const resolvedRequest = {
        method: resolvedStep.method,
        url: fullUrl,
        headers: resolvedStep.headers.reduce(
          (acc, h) => {
            if (h.enabled && h.key) acc[h.key] = h.value;
            return acc;
          },
          {} as Record<string, string>
        ),
        body: resolvedStep.body,
      };

      let response: Awaited<ReturnType<typeof executeRequest>> | StreamResult | undefined;

      if (options.useStream) {
        // --- STREAMING EXECUTION (Debug Mode Only) ---
        pendingSnapshot.streamStatus = "streaming";
        pendingSnapshot.streamChunks = [];

        const stream = executeStream(resolvedStep, envVariables, {
          abortSignal: stepAbort.controller.signal,
        });

        let next = await stream.next();
        while (!next.done) {
          if (stepAbort.controller.signal.aborted || masterAbort.signal.aborted) {
            throw new Error("Request aborted");
          }
          const { chunk } = next.value as StreamChunk;
          pendingSnapshot.streamChunks = limitStreamChunks([
            ...pendingSnapshot.streamChunks,
            chunk,
          ]);
          yield {
            type: "stream_chunk",
            snapshot: cloneSnapshot(pendingSnapshot),
            allSnapshots: cloneSnapshots(snapshots),
          };
          next = await stream.next();
        }

        response = next.value as StreamResult;
      } else {
        // --- NORMAL EXECUTION (Auto Mode) ---
        response = await executeRequest(resolvedStep, envVariables);
      }

      if (!response) {
        throw new Error("No response from step execution");
      }

      // Ensure normalized response for consistent downstream processing
      const resolvedResponse = options.useStream
        ? normalizeStreamResult(response as StreamResult)
        : (response as NormalizedResponse);

      clearStepAbort(step.id, stepAbort.timeoutId, abortControls, masterAbort, onMasterAbort);

      if (stepAbort.controller.signal.aborted || masterAbort.signal.aborted) {
        const abortedSnapshot = createCompletedSnapshot(
          pendingSnapshot,
          "error",
          null,
          runtimeVariables,
          "Request aborted",
          resolvedRequest,
          undefined,
          undefined,
          { body: response?.body ?? "", headers: response?.headers ?? {} },
          "error"
        );
        abortedSnapshot.highlightPath = extractHighlightPath(response?.body);
        snapshots[snapshots.length - 1] = abortedSnapshot;
        yield buildYield("step_complete", abortedSnapshot, snapshots);
        return;
      }

      runtimeVariables[alias] = toRuntimeValue(resolvedResponse);
      const stepStatus = toStepStatus(resolvedResponse.status);
      pendingSnapshot.streamStatus = "done";
      const completedSnapshot = createCompletedSnapshot(
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
        {
          body: resolvedResponse.body,
          headers: resolvedResponse.headers,
        },
        "done"
      );

      snapshots[snapshots.length - 1] = completedSnapshot;

      const isLastStep = stepId === stepsToRun[stepsToRun.length - 1];
      yield buildYield("step_complete", completedSnapshot, snapshots);
      if (isLastStep) {
        return;
      }
    } catch (error) {
      clearStepAbort(step.id, stepAbort.timeoutId, abortControls, masterAbort, onMasterAbort);

      const isAbort = stepAbort.controller.signal.aborted || masterAbort.signal.aborted;
      const errorBody = (error as Error)?.message;
      const failedSnapshot = createCompletedSnapshot(
        pendingSnapshot,
        "error",
        null,
        runtimeVariables,
        isAbort ? "Request aborted" : toErrorMessage(error),
        undefined,
        undefined,
        undefined,
        undefined,
        "error"
      );
      failedSnapshot.highlightPath = extractHighlightPath(errorBody);

      snapshots[snapshots.length - 1] = failedSnapshot;
      yield buildYield("step_complete", failedSnapshot, snapshots);

      if (!isAbort) {
        yield buildYield("error", failedSnapshot, snapshots);
      }
      return;
    }
    stepIndex++;
  }

  return;
}

function cloneRuntimeVariables(value?: Record<string, unknown>) {
  if (!value) return {};
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function createStepAbort(
  stepId: string,
  stepTimeoutMs: number,
  abortControls: Map<string, StepAbortControl>
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), stepTimeoutMs);
  abortControls.set(stepId, { controller, timeoutId });
  return { controller, timeoutId };
}

function clearStepAbort(
  stepId: string,
  timeoutId: ReturnType<typeof setTimeout>,
  abortControls: Map<string, StepAbortControl>,
  masterAbort: AbortController,
  onMasterAbort: () => void
) {
  clearTimeout(timeoutId);
  abortControls.delete(stepId);
  masterAbort.signal.removeEventListener("abort", onMasterAbort);
}

function buildAbortResult(
  step: PipelineStep,
  stepIndex: number,
  runtimeVariables: Record<string, unknown>,
  snapshots: StepSnapshot[]
) {
  const snapshot = createInitialSnapshot(
    step,
    stepIndex,
    "error",
    runtimeVariables,
    "Pipeline aborted"
  );
  snapshot.streamStatus = "error";
  snapshot.streamChunks = [];
  snapshots.push(snapshot);
  return buildYield("error", snapshot, snapshots);
}

function buildYield(
  type: GeneratorYield["type"],
  snapshot: StepSnapshot,
  snapshots: StepSnapshot[]
) {
  return {
    type,
    snapshot: cloneSnapshot(snapshot),
    allSnapshots: cloneSnapshots(snapshots),
  } satisfies GeneratorYield;
}

function resolveStep(
  step: PipelineStep,
  runtimeVars: Record<string, unknown>,
  envVars: Record<string, string>,
  variableOverrides: Record<string, string>
): PipelineStep {
  const resolve = (value: string) =>
    resolveTemplate(value, runtimeVars, envVars, variableOverrides);

  return {
    ...step,
    url: resolve(step.url),
    headers: step.headers.map((header) => ({
      ...header,
      key: resolve(header.key),
      value: resolve(header.value),
    })),
    params: step.params.map((param) => ({
      ...param,
      key: resolve(param.key),
      value: resolve(param.value),
    })),
    body: step.body ? resolve(step.body) : step.body,
  };
}

export function limitStreamChunks(chunks: string[]): string[] {
  if (chunks.length <= MAX_STREAM_CHUNKS) return chunks;
  return chunks.slice(-MAX_STREAM_CHUNKS);
}

function extractHighlightPath(body?: string): string | undefined {
  if (!body) return undefined;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const keys = ["error", "message", "detail", "msg", "reason"];
    for (const k of keys) {
      if (k in parsed) return k;
    }
  } catch {
    /* not JSON */
  }
  return undefined;
}
