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
import { createInitialSnapshot } from "./pipeline-snapshot-utils";
import {
  DEFAULT_STEP_TIMEOUT_MS,
  type GeneratorOptions,
  type NormalizedResponse,
  buildAbortedSnapshot,
  buildFailedSnapshot,
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
    const resolvedResponse = options.useStream
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
    const responses = await executeBatchRequestsThroughApiRoute(
      requests,
      envVariables,
      options.masterAbort.signal,
    );
    for (let i = 0; i < stage.length; i++) {
      const entry = stage[i]!;
      const response = responses[i] as RouteExecutionResponse | undefined;
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

function normalizeStreamResult(res: StreamResult): NormalizedResponse {
  return { ...res };
}

function buildStageEntry(
  step: PipelineStep | undefined,
  aliasMap: Map<string, StepAlias>,
  stepIndex: number,
  runtimeVariables: Record<string, unknown>,
  snapshots: StepSnapshot[],
) {
  if (!step) return null;
  const pendingSnapshot = createInitialSnapshot(step, stepIndex, "running", runtimeVariables, null);
  pendingSnapshot.startedAt = Date.now();
  snapshots.push(pendingSnapshot);
  return {
    step,
    pendingSnapshot,
    snapshotIndex: snapshots.length - 1,
    alias: aliasMap.get(step.id) ?? {
      alias: "reqUnknown",
      index: stepIndex,
      refs: ["reqUnknown"],
      stepId: step.id,
    },
  };
}

async function* completeSingleStep(
  stepAlias: StepAlias,
  pendingSnapshot: StepSnapshot,
  resolvedRequest: ReturnType<typeof buildResolvedRequest>,
  resolvedResponse: NormalizedResponse,
  runtimeVariables: Record<string, unknown>,
  snapshots: StepSnapshot[],
  masterAbort: AbortController,
  stepAbort: ReturnType<typeof createStepAbort>,
) {
  if (isAborted(stepAbort, masterAbort)) {
    const aborted = buildAbortedSnapshot(
      pendingSnapshot,
      runtimeVariables,
      resolvedRequest,
      resolvedResponse,
    );
    snapshots[snapshots.length - 1] = aborted;
    yield buildYield("step_complete", aborted, snapshots);
    return;
  }

  const runtimeValue = toRuntimeValue(resolvedResponse);
  stepAlias.refs.forEach((ref) => {
    runtimeVariables[ref] = runtimeValue;
  });
  const completed = buildSuccessSnapshot(
    pendingSnapshot,
    resolvedResponse,
    runtimeVariables,
    resolvedRequest,
  );
  snapshots[snapshots.length - 1] = completed;
  yield buildYield("step_complete", completed, snapshots);
}

async function* emitFailure(
  pendingSnapshot: StepSnapshot,
  runtimeVariables: Record<string, unknown>,
  error: unknown,
  snapshots: StepSnapshot[],
  aborted: boolean,
  snapshotIndex = snapshots.length - 1,
) {
  const failed = buildFailedSnapshot(pendingSnapshot, runtimeVariables, error, aborted);
  snapshots[snapshotIndex] = failed;
  yield buildYield("step_complete", failed, snapshots);
  if (!aborted) yield buildYield("error", failed, snapshots);
}
