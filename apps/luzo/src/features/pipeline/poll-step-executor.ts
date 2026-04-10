import type { PipelineExecutionEvent, StepSnapshot } from "@/types/pipeline-runtime";
import type { PollNodeConfig } from "@/types/workflow";
import { cloneRuntimeVariables } from "./generator-executor-shared";
import { cloneSnapshot } from "./pipeline-snapshot-utils";
import { evaluateConditionStep } from "./condition-evaluator";
import {
  createAsyncTimelineEvent,
  appendTimelineEvent,
  sleepWithAbort,
} from "./async-step-runtime";

const DEFAULT_INTERVAL_MS = 2_000;
const DEFAULT_MAX_ATTEMPTS = 10;
const POLL_METHOD = "GET" as const;
const POLL_URL = "";

function createPollSnapshot(
  nodeId: string,
  label: string,
  orderIndex: number,
  runtimeVariables: Record<string, unknown>,
): StepSnapshot {
  return {
    stepId: nodeId,
    stepIndex: orderIndex,
    stepName: label || "Poll",
    entryType: "condition",
    method: POLL_METHOD,
    url: POLL_URL,
    resolvedRequest: { method: POLL_METHOD, url: POLL_URL, headers: {}, body: null },
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
 * Executes a Poll node. Repeatedly evaluates stopCondition against runtime variables
 * at a configurable interval until the condition is truthy or maxAttempts is exhausted.
 *
 * Reuses the canonical condition evaluator — one implementation, three nodes (If, Assert, Poll).
 * Timeline events: poll_attempt per iteration, poll_wait between attempts, poll_terminal on exit.
 */
export async function* executePollGenerator(params: {
  nodeId: string;
  orderIndex: number;
  pollConfig: PollNodeConfig;
  runtimeVariables: Record<string, unknown>;
  envVariables: Record<string, string>;
  snapshots: StepSnapshot[];
  executionId: string;
  masterAbort: AbortController;
}): AsyncGenerator<PipelineExecutionEvent, void, Record<string, string> | undefined> {
  const {
    nodeId,
    orderIndex,
    pollConfig,
    runtimeVariables,
    envVariables,
    snapshots,
    executionId,
    masterAbort,
  } = params;

  let snapshot = createPollSnapshot(nodeId, pollConfig.label, orderIndex, runtimeVariables);
  snapshots.push(snapshot);
  const snapshotIndex = snapshots.length - 1;

  const intervalMs = pollConfig.intervalMs ?? DEFAULT_INTERVAL_MS;
  const maxAttempts = pollConfig.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  const conditionConfig = {
    kind: "condition" as const,
    label: pollConfig.label,
    rules: [],
    expression: pollConfig.stopCondition,
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (masterAbort.signal.aborted) {
      snapshot = { ...snapshot, status: "error", error: "Aborted", completedAt: Date.now() };
      snapshots[snapshotIndex] = snapshot;
      yield {
        type: "step_failed",
        snapshot: cloneSnapshot(snapshot),
        runtimeVariables: cloneRuntimeVariables(runtimeVariables),
      } satisfies PipelineExecutionEvent;
      return;
    }

    const { result } = evaluateConditionStep(conditionConfig, runtimeVariables, envVariables);

    const attemptEvent = createAsyncTimelineEvent({
      executionId,
      snapshot,
      eventKind: "poll_attempt",
      status: result ? "completed" : "running",
      sequenceNumber: orderIndex + attempt * 0.01,
      attemptNumber: attempt,
      summary: result
        ? `Attempt ${attempt}: condition met`
        : `Attempt ${attempt}: condition not yet met`,
      outcome: result ? "executed" : "waiting",
      metadata: { attempt, maxAttempts, stopCondition: pollConfig.stopCondition },
    });
    snapshot = appendTimelineEvent(snapshot, attemptEvent);
    yield { type: "timeline_event", event: attemptEvent, snapshot, runtimeVariables };

    if (result) {
      const terminalEvent = createAsyncTimelineEvent({
        executionId,
        snapshot,
        eventKind: "poll_terminal",
        status: "completed",
        sequenceNumber: orderIndex + attempt * 0.01 + 0.001,
        attemptNumber: attempt,
        summary: `Poll succeeded after ${attempt} attempt${attempt === 1 ? "" : "s"}`,
        outcome: "executed",
        metadata: { attempt, maxAttempts },
      });
      snapshot = appendTimelineEvent(snapshot, terminalEvent);
      yield { type: "timeline_event", event: terminalEvent, snapshot, runtimeVariables };

      snapshot = { ...snapshot, status: "done", completedAt: Date.now() };
      snapshots[snapshotIndex] = snapshot;
      yield {
        type: "step_completed",
        snapshot: cloneSnapshot(snapshot),
        runtimeVariables: cloneRuntimeVariables(runtimeVariables),
      } satisfies PipelineExecutionEvent;
      return;
    }

    if (attempt < maxAttempts) {
      const waitEvent = createAsyncTimelineEvent({
        executionId,
        snapshot,
        eventKind: "poll_wait",
        status: "paused",
        sequenceNumber: orderIndex + attempt * 0.01 + 0.005,
        attemptNumber: attempt,
        summary: `Waiting ${intervalMs}ms before attempt ${attempt + 1}`,
        outcome: "waiting",
        metadata: { intervalMs },
      });
      snapshot = appendTimelineEvent(snapshot, waitEvent);
      yield { type: "timeline_event", event: waitEvent, snapshot, runtimeVariables };

      try {
        await sleepWithAbort(intervalMs, masterAbort.signal);
      } catch {
        snapshot = { ...snapshot, status: "error", error: "Aborted", completedAt: Date.now() };
        snapshots[snapshotIndex] = snapshot;
        yield {
          type: "step_failed",
          snapshot: cloneSnapshot(snapshot),
          runtimeVariables: cloneRuntimeVariables(runtimeVariables),
        } satisfies PipelineExecutionEvent;
        return;
      }
    }
  }

  const timeoutMsg = `Poll timed out after ${maxAttempts} attempt${maxAttempts === 1 ? "" : "s"}`;
  const terminalEvent = createAsyncTimelineEvent({
    executionId,
    snapshot,
    eventKind: "poll_terminal",
    status: "failed",
    sequenceNumber: orderIndex + maxAttempts * 0.01 + 0.002,
    attemptNumber: maxAttempts,
    summary: timeoutMsg,
    terminalReason: "max_attempts_exceeded",
    outcome: "timed_out",
    metadata: { maxAttempts },
  });
  snapshot = appendTimelineEvent(snapshot, terminalEvent);
  yield { type: "timeline_event", event: terminalEvent, snapshot, runtimeVariables };

  snapshot = { ...snapshot, status: "error", error: timeoutMsg, completedAt: Date.now() };
  snapshots[snapshotIndex] = snapshot;
  yield {
    type: "step_failed",
    snapshot: cloneSnapshot(snapshot),
    runtimeVariables: cloneRuntimeVariables(runtimeVariables),
  } satisfies PipelineExecutionEvent;
}
