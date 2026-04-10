import TinyQueue from "tinyqueue";
import type { PipelineExecutionEvent, StepSnapshot } from "@/types/pipeline-runtime";
import type { DelayNodeConfig } from "@/types/workflow";
import { cloneRuntimeVariables } from "./generator-executor-shared";
import { cloneSnapshot } from "./pipeline-snapshot-utils";

const DELAY_METHOD = "GET" as const;
const DELAY_URL = "";

interface WakeEntry {
  wakeAt: number;
  nodeId: string;
}

/**
 * Module-level min-heap of pending delay wake-up times.
 * Ordered ascending by wakeAt so the earliest wake fires first
 * when multiple delay nodes are scheduled in the same stage.
 */
const wakeQueue = new TinyQueue<WakeEntry>([], (a, b) => a.wakeAt - b.wakeAt);

function createDelaySnapshot(
  nodeId: string,
  label: string,
  orderIndex: number,
  runtimeVariables: Record<string, unknown>,
): StepSnapshot {
  return {
    stepId: nodeId,
    stepIndex: orderIndex,
    stepName: label || "Delay",
    entryType: "condition",
    method: DELAY_METHOD,
    url: DELAY_URL,
    resolvedRequest: { method: DELAY_METHOD, url: DELAY_URL, headers: {}, body: null },
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
 * Executes a delay node. Schedules a wake-up via the module-level min-heap
 * so concurrent delays in the same stage resolve in chronological order.
 */
export async function* executeDelayGenerator(params: {
  nodeId: string;
  orderIndex: number;
  delayConfig: DelayNodeConfig;
  runtimeVariables: Record<string, unknown>;
  snapshots: StepSnapshot[];
}): AsyncGenerator<PipelineExecutionEvent, void, Record<string, string> | undefined> {
  const { nodeId, orderIndex, delayConfig, runtimeVariables, snapshots } = params;

  let snapshot = createDelaySnapshot(nodeId, delayConfig.label, orderIndex, runtimeVariables);
  snapshots.push(snapshot);
  const snapshotIndex = snapshots.length - 1;

  const wakeAt = Date.now() + delayConfig.durationMs;
  wakeQueue.push({ wakeAt, nodeId });

  // Sleep until this node's wakeAt time (respecting queue order).
  while (wakeQueue.peek()?.nodeId !== nodeId) {
    await sleep(8);
  }
  const remaining = wakeAt - Date.now();
  if (remaining > 0) await sleep(remaining);
  wakeQueue.pop();

  snapshot = {
    ...snapshot,
    status: "done",
    completedAt: Date.now(),
  };
  snapshots[snapshotIndex] = snapshot;

  yield {
    type: "delay_elapsed",
    snapshot: cloneSnapshot(snapshot),
    runtimeVariables: cloneRuntimeVariables(runtimeVariables),
    durationMs: delayConfig.durationMs,
  } satisfies PipelineExecutionEvent;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
