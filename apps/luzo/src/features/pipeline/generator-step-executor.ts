import { executeRequest } from "@/app/actions/api-tests";
import {
  type StreamChunk,
  type StreamResult,
  executeRequestStream as executeStream,
} from "@/services/http/client";
import {
  executeBatchRequestsThroughApiRoute,
  type RouteExecutionResponse,
} from "@/services/http/execute-route-client";
import type { PipelineStep } from "@/types";
import type { PipelineExecutionEvent, StepAlias, StepSnapshot } from "@/types/pipeline-runtime";
import { resolveAsyncStepPolicies } from "./async-step-executor";
import { toRuntimeValue } from "./pipeline-execution-mappers";
import {
  DEFAULT_STEP_TIMEOUT_MS,
  type GeneratorOptions,
  buildExecutionEvent,
  buildResolvedRequest,
  buildSuccessSnapshot,
  clearStepAbort,
  cloneRuntimeVariables,
  createStepAbort,
  isAborted,
  limitStreamChunks,
  resolveStep,
} from "./generator-executor-shared";
import { cloneSnapshot, createInitialSnapshot } from "./pipeline-snapshot-utils";
import {
  executeMockStep,
  buildStageEntry,
  completeSingleStep,
  emitFailure,
} from "./step-executor-helpers";

export async function* executeStepGenerator(
  step: PipelineStep,
  stepIndex: number,
  stepAlias: StepAlias,
  runtimeVariables: Record<string, unknown>,
  envVariables: Record<string, string>,
  snapshots: StepSnapshot[],
  options: GeneratorOptions,
): AsyncGenerator<PipelineExecutionEvent, void, Record<string, string> | undefined> {
  let pendingSnapshot: StepSnapshot = {
    ...createInitialSnapshot(step, stepIndex, "running", runtimeVariables, null),
    startedAt: Date.now(),
  };
  snapshots.push(pendingSnapshot);
  const snapshotIndex = snapshots.length - 1;

  const variableOverrides = (yield buildExecutionEvent("step_ready", pendingSnapshot)) ?? {};
  const stepAbort = createStepAbort(
    step.id,
    options.stepTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS,
    options.abortControls,
  );
  const onMasterAbort = () => stepAbort.controller.abort();
  options.masterAbort.signal.addEventListener("abort", onMasterAbort, { once: true });

  try {
    const resolvedStep = resolveStep(step, runtimeVariables, envVariables, variableOverrides);
    const resolvedRequest = buildResolvedRequest(resolvedStep);
    let resolvedResponse;
    if (resolvedStep.mockConfig?.enabled) {
      resolvedResponse = await executeMockStep(resolvedStep);
    } else if (options.useStream) {
      const streamed = yield* runStreamExecution(
        resolvedStep,
        envVariables,
        pendingSnapshot,
        snapshots,
        snapshotIndex,
        stepAbort,
        options.masterAbort,
      );
      pendingSnapshot = streamed.snapshot;
      resolvedResponse = normalizeStreamResult(streamed.response);
    } else {
      resolvedResponse = await executeRequest(resolvedStep, envVariables);
    }

    if (stepAbort.timeoutId) {
      clearTimeout(stepAbort.timeoutId);
      stepAbort.timeoutId = undefined;
    }
    const asyncIterator = resolveAsyncStepPolicies({
      executionId: options.executionId ?? crypto.randomUUID(),
      step: resolvedStep,
      snapshot: pendingSnapshot,
      response: resolvedResponse,
      runtimeVariables,
      envVariables,
      masterAbort: options.masterAbort,
    });
    let asyncResult = await asyncIterator.next();
    while (!asyncResult.done) {
      const asyncEvent = asyncResult.value;
      if (asyncEvent.type === "timeline_event" && asyncEvent.snapshot) {
        pendingSnapshot = asyncEvent.snapshot;
        snapshots[snapshotIndex] = pendingSnapshot;
      }
      yield asyncEvent;
      asyncResult = await asyncIterator.next();
    }
    pendingSnapshot = asyncResult.value.snapshot;
    resolvedResponse = asyncResult.value.response;

    clearStepAbort(step.id, stepAbort, options.abortControls, options.masterAbort, onMasterAbort);
    yield* completeSingleStep(
      stepAlias,
      pendingSnapshot,
      resolvedRequest,
      resolvedResponse,
      runtimeVariables,
      snapshots,
      options.masterAbort,
      stepAbort,
    );
  } catch (error) {
    clearStepAbort(step.id, stepAbort, options.abortControls, options.masterAbort, onMasterAbort);
    yield* emitFailure(
      pendingSnapshot,
      runtimeVariables,
      error,
      snapshots,
      isAborted(stepAbort, options.masterAbort),
    );
  }
}

export async function* executeParallelStage(
  stageStepIds: string[],
  stepMap: Map<string, PipelineStep>,
  aliasMap: Map<string, StepAlias>,
  startIndex: number,
  runtimeVariables: Record<string, unknown>,
  envVariables: Record<string, string>,
  snapshots: StepSnapshot[],
  options: GeneratorOptions,
): AsyncGenerator<PipelineExecutionEvent, void, Record<string, string> | undefined> {
  const stage = stageStepIds
    .map((stepId, index) =>
      buildStageEntry(
        stepMap.get(stepId),
        aliasMap,
        startIndex + index,
        runtimeVariables,
        snapshots,
      ),
    )
    .filter((entry): entry is NonNullable<ReturnType<typeof buildStageEntry>> => entry !== null);

  for (const entry of stage) {
    yield buildExecutionEvent("step_ready", entry.pendingSnapshot);
  }

  const requests = stage.map((entry) =>
    resolveStep(entry.step, cloneRuntimeVariables(runtimeVariables), envVariables, {}),
  );

  try {
    const responses: (RouteExecutionResponse | null)[] = Array.from(
      { length: stage.length },
      () => null,
    );
    const realIndices = stage.map((_, i) => i).filter((i) => !stage[i]!.step.mockConfig?.enabled);
    const mockIndices = stage.map((_, i) => i).filter((i) => stage[i]!.step.mockConfig?.enabled);

    await Promise.all([
      realIndices.length > 0
        ? executeBatchRequestsThroughApiRoute(
            realIndices.map((i) => requests[i]!),
            envVariables,
            options.masterAbort.signal,
          ).then((res) => {
            realIndices.forEach((realIdx, resIdx) => {
              responses[realIdx] = res[resIdx] as RouteExecutionResponse;
            });
          })
        : Promise.resolve(),
      ...mockIndices.map(async (i) => {
        const { buildMockResponse } = await import("./step-executor-helpers");
        const mock = stage[i]!.step.mockConfig!;
        if (mock.latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, mock.latencyMs));
        responses[i] = buildMockResponse(stage[i]!.step) as unknown as RouteExecutionResponse;
      }),
    ]);

    for (let i = 0; i < stage.length; i++) {
      const entry = stage[i]!;
      const response = responses[i];
      if (!response) continue;
      const resolvedRequest = buildResolvedRequest(requests[i]!);
      const runtimeValue = toRuntimeValue(response);
      entry.alias.refs.forEach((ref) => {
        runtimeVariables[ref] = runtimeValue;
      });
      const snapshot = buildSuccessSnapshot(
        entry.pendingSnapshot,
        response,
        runtimeVariables,
        resolvedRequest,
      );
      snapshots[entry.snapshotIndex] = snapshot;
      yield buildExecutionEvent(
        snapshot.status === "error" ? "step_failed" : "step_completed",
        snapshot,
        runtimeVariables,
      );
    }
  } catch (error) {
    for (const entry of stage) {
      yield* emitFailure(
        entry.pendingSnapshot,
        runtimeVariables,
        error,
        snapshots,
        false,
        entry.snapshotIndex,
      );
    }
  }
}

async function* runStreamExecution(
  resolvedStep: PipelineStep,
  envVariables: Record<string, string>,
  pendingSnapshot: StepSnapshot,
  snapshots: StepSnapshot[],
  snapshotIndex: number,
  stepAbort: ReturnType<typeof createStepAbort>,
  masterAbort: AbortController,
): AsyncGenerator<
  PipelineExecutionEvent,
  { response: StreamResult; snapshot: StepSnapshot },
  Record<string, string> | undefined
> {
  let currentSnapshot: StepSnapshot = {
    ...cloneSnapshot(pendingSnapshot),
    streamStatus: "streaming" as const,
    streamChunks: [],
  };
  snapshots[snapshotIndex] = currentSnapshot;
  const stream = executeStream(resolvedStep, envVariables, {
    abortSignal: stepAbort.controller.signal,
  });
  let next = await stream.next();

  while (!next.done) {
    if (isAborted(stepAbort, masterAbort)) throw new Error("Request aborted");
    currentSnapshot = {
      ...cloneSnapshot(currentSnapshot),
      streamStatus: "streaming",
      streamChunks: limitStreamChunks([
        ...currentSnapshot.streamChunks,
        (next.value as StreamChunk).chunk,
      ]),
    };
    snapshots[snapshotIndex] = currentSnapshot;
    yield buildExecutionEvent(
      "step_stream_chunk",
      currentSnapshot,
      undefined,
      (next.value as StreamChunk).chunk,
    );
    next = await stream.next();
  }

  return { response: next.value as StreamResult, snapshot: currentSnapshot };
}

function normalizeStreamResult(res: StreamResult) {
  return { ...res };
}
