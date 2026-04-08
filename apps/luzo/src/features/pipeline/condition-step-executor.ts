import type { PipelineExecutionEvent, StepSnapshot } from "@/types/pipeline-runtime";
import type { ConditionNodeConfig } from "@/types/workflow";
import { evaluateConditionStep } from "./condition-evaluator";
import { cloneRuntimeVariables } from "./generator-executor-shared";
import { cloneSnapshot } from "./pipeline-snapshot-utils";

const CONDITION_METHOD = "GET" as const;
const CONDITION_URL = "";

/**
 * Creates a minimal synthetic snapshot for a condition node.
 * Condition nodes have no HTTP request, so resolvedRequest is a zero-value stub.
 */
function createConditionSnapshot(
  nodeId: string,
  label: string,
  orderIndex: number,
  runtimeVariables: Record<string, unknown>,
): StepSnapshot {
  return {
    stepId: nodeId,
    stepIndex: orderIndex,
    stepName: label || "Condition",
    entryType: "condition",
    method: CONDITION_METHOD,
    url: CONDITION_URL,
    resolvedRequest: { method: CONDITION_METHOD, url: CONDITION_URL, headers: {}, body: null },
    status: "running",
    reducedResponse: null,
    variables: { ...runtimeVariables },
    error: null,
    startedAt: Date.now(),
    completedAt: null,
    streamStatus: "idle",
    streamChunks: [],
    timelineEvents: [],
  };
}

/**
 * Executes a condition node as a generator step.
 * Yields step_ready (for debug-mode pause support) then condition_evaluated.
 *
 * Condition nodes are synchronous and never perform I/O.
 */
export async function* executeConditionGenerator(params: {
  nodeId: string;
  orderIndex: number;
  conditionConfig: ConditionNodeConfig;
  runtimeVariables: Record<string, unknown>;
  envVariables: Record<string, string>;
  snapshots: StepSnapshot[];
  pauseBeforeEvaluate?: boolean;
}): AsyncGenerator<PipelineExecutionEvent, void, Record<string, string> | undefined> {
  const {
    nodeId,
    orderIndex,
    conditionConfig,
    runtimeVariables,
    envVariables,
    snapshots,
    pauseBeforeEvaluate = false,
  } = params;

  let snapshot = createConditionSnapshot(
    nodeId,
    conditionConfig.label,
    orderIndex,
    runtimeVariables,
  );
  snapshots.push(snapshot);
  const snapshotIndex = snapshots.length - 1;

  if (pauseBeforeEvaluate) {
    // Pause point in debug mode — debug controller catches step_ready.
    yield {
      type: "step_ready",
      snapshot: cloneSnapshot(snapshot),
    } satisfies PipelineExecutionEvent;
  }

  const { result, resolvedInputs } = evaluateConditionStep(
    conditionConfig,
    runtimeVariables,
    envVariables,
  );

  snapshot = {
    ...snapshot,
    status: "done",
    completedAt: Date.now(),
    conditionResult: { result, resolvedInputs },
  };
  snapshots[snapshotIndex] = snapshot;

  yield {
    type: "condition_evaluated",
    snapshot: cloneSnapshot(snapshot),
    result,
    runtimeVariables: cloneRuntimeVariables(runtimeVariables),
  } satisfies PipelineExecutionEvent;
}
