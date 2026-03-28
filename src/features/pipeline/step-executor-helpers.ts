import type { PipelineStep } from "@/types";
import type { StepAlias, StepSnapshot } from "@/types/pipeline-runtime";
import { toRuntimeValue } from "./pipeline-execution-mappers";
import { createInitialSnapshot } from "./pipeline-snapshot-utils";
import {
  type NormalizedResponse,
  buildExecutionEvent,
  buildAbortedSnapshot,
  buildFailedSnapshot,
  buildResolvedRequest,
  buildSuccessSnapshot,
  isAborted,
} from "./generator-executor-shared";
import type { createStepAbort } from "./generator-executor-shared";

/** Build a mock NormalizedResponse from a step's mockConfig. */
export function buildMockResponse(step: PipelineStep): NormalizedResponse {
  const mock = step.mockConfig!;
  return {
    status: mock.statusCode,
    statusText: "Mocked",
    headers: { "x-luzo-mock": "true" },
    body: mock.body,
    time: mock.latencyMs,
    size: mock.body.length,
  };
}

/** Simulate mock latency and return mock response. */
export async function executeMockStep(step: PipelineStep): Promise<NormalizedResponse> {
  if (step.mockConfig!.latencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, step.mockConfig!.latencyMs));
  }
  return buildMockResponse(step);
}

/** Build a stage entry for parallel execution. */
export function buildStageEntry(
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

/** Emit success or aborted snapshot for a completed single step. */
export async function* completeSingleStep(
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
    yield buildExecutionEvent("step_failed", aborted, runtimeVariables);
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
  yield buildExecutionEvent("step_completed", completed, runtimeVariables);
}

/** Emit failure snapshot. */
export async function* emitFailure(
  pendingSnapshot: StepSnapshot,
  runtimeVariables: Record<string, unknown>,
  error: unknown,
  snapshots: StepSnapshot[],
  aborted: boolean,
  snapshotIndex = snapshots.length - 1,
) {
  const failed = buildFailedSnapshot(pendingSnapshot, runtimeVariables, error, aborted);
  snapshots[snapshotIndex] = failed;
  yield buildExecutionEvent("step_failed", failed, runtimeVariables);
}
