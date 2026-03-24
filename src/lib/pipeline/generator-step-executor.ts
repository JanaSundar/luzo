import { executeRequest } from "@/app/actions/api-tests";
import {
  type StreamChunk,
  type StreamResult,
  executeRequestStream as executeStream,
} from "@/lib/http/client";
import {
  executeBatchRequestsThroughApiRoute,
  type RouteExecutionResponse,
} from "@/lib/http/execute-route-client";
import type { PipelineStep } from "@/types";
import type { GeneratorYield, StepAlias, StepSnapshot } from "@/types/pipeline-runtime";
import { toRuntimeValue } from "./pipeline-execution-mappers";
import {
  DEFAULT_STEP_TIMEOUT_MS,
  type GeneratorOptions,
  buildResolvedRequest,
  buildSuccessSnapshot,
  buildYield,
  clearStepAbort,
  cloneRuntimeVariables,
  createStepAbort,
  isAborted,
  limitStreamChunks,
  resolveStep,
} from "./generator-executor-shared";
import { createInitialSnapshot } from "./pipeline-snapshot-utils";
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
): AsyncGenerator<GeneratorYield, void, Record<string, string> | undefined> {
  const pendingSnapshot = createInitialSnapshot(step, stepIndex, "running", runtimeVariables, null);
  pendingSnapshot.startedAt = Date.now();
  snapshots.push(pendingSnapshot);

  const variableOverrides = (yield buildYield("step_ready", pendingSnapshot, snapshots)) ?? {};
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

    const resolvedResponse = resolvedStep.mockConfig?.enabled
      ? await executeMockStep(resolvedStep)
      : options.useStream
        ? normalizeStreamResult(
            yield* runStreamExecution(
              resolvedStep,
              envVariables,
              pendingSnapshot,
              snapshots,
              stepAbort,
              options.masterAbort,
            ),
          )
        : await executeRequest(resolvedStep, envVariables);

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
): AsyncGenerator<GeneratorYield, void, Record<string, string> | undefined> {
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
    yield buildYield("step_ready", entry.pendingSnapshot, snapshots);
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
      yield buildYield("step_complete", snapshot, snapshots);
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
  stepAbort: ReturnType<typeof createStepAbort>,
  masterAbort: AbortController,
): AsyncGenerator<ReturnType<typeof buildYield>, StreamResult, Record<string, string> | undefined> {
  pendingSnapshot.streamStatus = "streaming";
  pendingSnapshot.streamChunks = [];
  const stream = executeStream(resolvedStep, envVariables, {
    abortSignal: stepAbort.controller.signal,
  });
  let next = await stream.next();

  while (!next.done) {
    if (isAborted(stepAbort, masterAbort)) throw new Error("Request aborted");
    pendingSnapshot.streamChunks = limitStreamChunks([
      ...pendingSnapshot.streamChunks,
      (next.value as StreamChunk).chunk,
    ]);
    yield buildYield("stream_chunk", pendingSnapshot, snapshots);
    next = await stream.next();
  }

  return next.value as StreamResult;
}

function normalizeStreamResult(res: StreamResult) {
  return { ...res };
}
