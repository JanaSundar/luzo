import type { PipelineExecutionEvent, StepSnapshot } from "@/types/pipeline-runtime";
import { cloneRuntimeVariables } from "./generator-executor-shared";
import { cloneSnapshot } from "./pipeline-snapshot-utils";

const END_METHOD = "GET" as const;
const END_URL = "";

function createEndSnapshot(
  nodeId: string,
  label: string,
  orderIndex: number,
  runtimeVariables: Record<string, unknown>,
): StepSnapshot {
  return {
    stepId: nodeId,
    stepIndex: orderIndex,
    stepName: label || "End",
    entryType: "condition",
    method: END_METHOD,
    url: END_URL,
    resolvedRequest: { method: END_METHOD, url: END_URL, headers: {}, body: null },
    status: "done",
    reducedResponse: null,
    variables: { ...runtimeVariables },
    error: null,
    startedAt: Date.now(),
    completedAt: Date.now(),
    streamStatus: "idle",
    streamChunks: [],
    timelineEvents: [],
  };
}

/**
 * No-op executor for the End node. Immediately yields `end_reached`.
 * The End node is a UX clarity terminal — it has no runtime effect.
 */
export async function* executeEndGenerator(params: {
  nodeId: string;
  orderIndex: number;
  label: string;
  runtimeVariables: Record<string, unknown>;
  snapshots: StepSnapshot[];
}): AsyncGenerator<PipelineExecutionEvent, void, Record<string, string> | undefined> {
  const { nodeId, orderIndex, label, runtimeVariables, snapshots } = params;

  const snapshot = createEndSnapshot(nodeId, label, orderIndex, runtimeVariables);
  snapshots.push(snapshot);

  yield {
    type: "end_reached",
    snapshot: cloneSnapshot(snapshot),
    runtimeVariables: cloneRuntimeVariables(runtimeVariables),
  } satisfies PipelineExecutionEvent;
}
