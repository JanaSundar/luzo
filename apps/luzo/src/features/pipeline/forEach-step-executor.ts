import type { PipelineExecutionEvent, StepSnapshot } from "@/types/pipeline-runtime";
import type { ForEachNodeConfig } from "@/types/workflow";
import { cloneRuntimeVariables } from "./generator-executor-shared";
import { cloneSnapshot } from "./pipeline-snapshot-utils";
import { getByPath } from "./variable-resolver";
import { createAsyncTimelineEvent, appendTimelineEvent } from "./async-step-runtime";

const FOREACH_METHOD = "GET" as const;
const FOREACH_URL = "";

function createForEachSnapshot(
  nodeId: string,
  label: string,
  orderIndex: number,
  runtimeVariables: Record<string, unknown>,
): StepSnapshot {
  return {
    stepId: nodeId,
    stepIndex: orderIndex,
    stepName: label || "ForEach",
    entryType: "condition",
    method: FOREACH_METHOD,
    url: FOREACH_URL,
    resolvedRequest: { method: FOREACH_METHOD, url: FOREACH_URL, headers: {}, body: null },
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

function evaluateMapExpression(
  expression: string,
  item: unknown,
  index: number,
  runtimeVariables: Record<string, unknown>,
): unknown {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("item", "index", "vars", `"use strict"; return (${expression});`);
    return fn(item, index, runtimeVariables);
  } catch {
    return item;
  }
}

/**
 * Executes a ForEach node. Iterates over a collection variable, emitting
 * iteration_start / iteration_end timeline events per item.
 * Sets loop.results in runtimeVariables after all iterations complete.
 */
export async function* executeForEachGenerator(params: {
  nodeId: string;
  orderIndex: number;
  forEachConfig: ForEachNodeConfig;
  runtimeVariables: Record<string, unknown>;
  snapshots: StepSnapshot[];
  executionId: string;
}): AsyncGenerator<PipelineExecutionEvent, void, Record<string, string> | undefined> {
  const { nodeId, orderIndex, forEachConfig, runtimeVariables, snapshots, executionId } = params;

  let snapshot = createForEachSnapshot(nodeId, forEachConfig.label, orderIndex, runtimeVariables);
  snapshots.push(snapshot);
  const snapshotIndex = snapshots.length - 1;

  const collection = getByPath(runtimeVariables, forEachConfig.collectionPath);
  const items = Array.isArray(collection) ? collection : [];

  if (items.length === 0) {
    const skipEvent = createAsyncTimelineEvent({
      executionId,
      snapshot,
      eventKind: "iteration_skip",
      status: "completed",
      sequenceNumber: orderIndex + 0.1,
      summary: `No items in ${forEachConfig.collectionPath} — skipping iteration`,
      outcome: "skipped",
    });
    snapshot = appendTimelineEvent(snapshot, skipEvent);
    yield { type: "timeline_event", event: skipEvent, snapshot, runtimeVariables };
  }

  const results: unknown[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const startEvent = createAsyncTimelineEvent({
      executionId,
      snapshot,
      eventKind: "iteration_start",
      status: "running",
      sequenceNumber: orderIndex + 0.1 + i * 0.01,
      attemptNumber: i + 1,
      summary: `Iteration ${i + 1} of ${items.length}`,
      metadata: { index: i, item },
    });
    snapshot = appendTimelineEvent(snapshot, startEvent);
    yield { type: "timeline_event", event: startEvent, snapshot, runtimeVariables };

    runtimeVariables["loop.index"] = i;
    runtimeVariables["loop.item"] = item;

    const mapped = forEachConfig.mapExpression?.trim()
      ? evaluateMapExpression(forEachConfig.mapExpression, item, i, runtimeVariables)
      : item;
    results.push(mapped);

    const endEvent = createAsyncTimelineEvent({
      executionId,
      snapshot,
      eventKind: "iteration_end",
      status: "completed",
      sequenceNumber: orderIndex + 0.15 + i * 0.01,
      attemptNumber: i + 1,
      summary: `Iteration ${i + 1} complete`,
      outcome: "executed",
      metadata: { index: i, result: mapped },
    });
    snapshot = appendTimelineEvent(snapshot, endEvent);
    yield { type: "timeline_event", event: endEvent, snapshot, runtimeVariables };
  }

  runtimeVariables["loop.results"] = results;

  snapshot = { ...snapshot, status: "done", completedAt: Date.now() };
  snapshots[snapshotIndex] = snapshot;

  yield {
    type: "step_completed",
    snapshot: cloneSnapshot(snapshot),
    runtimeVariables: cloneRuntimeVariables(runtimeVariables),
  } satisfies PipelineExecutionEvent;
}
