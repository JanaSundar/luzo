import type { PipelineExecutionEvent, StepSnapshot } from "@/types/pipeline-runtime";
import type { LogNodeConfig } from "@/types/workflow";
import { cloneRuntimeVariables } from "./generator-executor-shared";
import { cloneSnapshot } from "./pipeline-snapshot-utils";
import { resolveTemplate } from "./variable-resolver";
import { createAsyncTimelineEvent, appendTimelineEvent } from "./async-step-runtime";

const LOG_METHOD = "GET" as const;
const LOG_URL = "";

function createLogSnapshot(
  nodeId: string,
  label: string,
  orderIndex: number,
  runtimeVariables: Record<string, unknown>,
): StepSnapshot {
  return {
    stepId: nodeId,
    stepIndex: orderIndex,
    stepName: label || "Log",
    entryType: "condition",
    method: LOG_METHOD,
    url: LOG_URL,
    resolvedRequest: { method: LOG_METHOD, url: LOG_URL, headers: {}, body: null },
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
 * Executes a Log node. Interpolates the message template against runtime variables
 * and emits a `log_emitted` timeline event for visibility in the debugger.
 */
export async function* executeLogGenerator(params: {
  nodeId: string;
  orderIndex: number;
  logConfig: LogNodeConfig;
  runtimeVariables: Record<string, unknown>;
  snapshots: StepSnapshot[];
  executionId: string;
}): AsyncGenerator<PipelineExecutionEvent, void, Record<string, string> | undefined> {
  const { nodeId, orderIndex, logConfig, runtimeVariables, snapshots, executionId } = params;

  let snapshot = createLogSnapshot(nodeId, logConfig.label, orderIndex, runtimeVariables);
  snapshots.push(snapshot);
  const snapshotIndex = snapshots.length - 1;

  const interpolated = resolveTemplate(logConfig.message, runtimeVariables);

  const logEvent = createAsyncTimelineEvent({
    executionId,
    snapshot,
    eventKind: "log_emitted",
    status: "completed",
    sequenceNumber: orderIndex + 0.1,
    summary: interpolated,
    outcome: "executed",
    metadata: { message: interpolated, raw: logConfig.message },
  });
  snapshot = appendTimelineEvent(snapshot, logEvent);
  yield { type: "timeline_event", event: logEvent, snapshot, runtimeVariables };

  snapshot = { ...snapshot, status: "done", completedAt: Date.now() };
  snapshots[snapshotIndex] = snapshot;

  yield {
    type: "step_completed",
    snapshot: cloneSnapshot(snapshot),
    runtimeVariables: cloneRuntimeVariables(runtimeVariables),
  } satisfies PipelineExecutionEvent;
}
