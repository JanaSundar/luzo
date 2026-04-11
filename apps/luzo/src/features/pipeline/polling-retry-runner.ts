import { executeRequest } from "@/app/actions/api-tests";
import pRetry, { AbortError } from "p-retry";
import type { PipelineStep } from "@/types";
import type { PipelineExecutionEvent, StepSnapshot } from "@/types/pipeline-runtime";
import type { TimelineEvent } from "@/types/timeline-event";
import { appendTimelineEvent, createAsyncTimelineEvent, evaluateRules } from "./async-step-runtime";
import type { NormalizedResponse } from "./generator-executor-shared";

interface AsyncStepResult {
  response: NormalizedResponse;
  snapshot: StepSnapshot;
  runtimeVariables: Record<string, unknown>;
}

function getPollingFailureSummary(reason: string) {
  switch (reason) {
    case "failure_condition":
      return "Polling stopped on failure condition";
    case "timeout":
      return "Polling timed out";
    default:
      return "Polling exhausted max attempts";
  }
}

function getPollingFailureMessage(reason: string) {
  switch (reason) {
    case "failure_condition":
      return "Polling failure condition matched";
    case "timeout":
      return "Polling timed out";
    default:
      return "Polling max attempts exceeded";
  }
}

export function runPollingWithRetry(params: {
  executionId: string;
  step: PipelineStep;
  snapshot: StepSnapshot;
  response: NormalizedResponse;
  runtimeVariables: Record<string, unknown>;
  envVariables: Record<string, string>;
  masterAbort: AbortController;
}) {
  const { executionId, step, envVariables, masterAbort } = params;
  let { snapshot, response, runtimeVariables } = params;
  const policy = step.pollingPolicy!;
  const startedAt = Date.now();
  const queue: PipelineExecutionEvent[] = [];
  let notify: (() => void) | null = null;
  let done = false;
  let thrownError: Error | null = null;
  let terminalReason:
    | "success_condition"
    | "failure_condition"
    | "timeout"
    | "max_attempts"
    | null = null;
  let lastAttemptNumber = 1;

  const pushEvent = (event: PipelineExecutionEvent) => {
    queue.push(event);
    notify?.();
    notify = null;
  };

  const emitTimeline = ({
    eventKind,
    status,
    attemptNumber,
    sequenceNumber,
    summary,
    outcome,
    terminal,
  }: {
    eventKind: "poll_attempt" | "poll_wait" | "poll_terminal";
    status: "running" | "paused" | "completed" | "failed";
    attemptNumber: number;
    sequenceNumber: number;
    summary: string;
    outcome?: TimelineEvent["outcome"];
    terminal?: string | null;
  }) => {
    const timelineEvent = createAsyncTimelineEvent({
      executionId,
      snapshot,
      eventKind,
      status,
      attemptNumber,
      sequenceNumber,
      summary,
      outcome,
      terminalReason: terminal ?? null,
    });
    snapshot = appendTimelineEvent(snapshot, timelineEvent);
    pushEvent({ type: "timeline_event", event: timelineEvent, snapshot, runtimeVariables });
  };

  const task = pRetry(
    async (attemptNumber) => {
      if (masterAbort.signal.aborted) throw new AbortError("Request aborted");
      lastAttemptNumber = attemptNumber;

      if (attemptNumber > 1) {
        response = await executeRequest(step, envVariables);
      }

      emitTimeline({
        eventKind: "poll_attempt",
        status: "running",
        attemptNumber,
        sequenceNumber: snapshot.stepIndex + attemptNumber / 100,
        summary: `Polling attempt ${attemptNumber}`,
      });

      if (evaluateRules(response, policy.successRules)) {
        terminalReason = "success_condition";
        return response;
      }

      if (evaluateRules(response, policy.failureRules ?? [])) {
        terminalReason = "failure_condition";
        throw new AbortError("Polling failure condition matched");
      }

      if (policy.timeoutMs != null && Date.now() - startedAt >= policy.timeoutMs) {
        terminalReason = "timeout";
        throw new AbortError("Polling timed out");
      }

      throw new Error("Polling condition not yet satisfied");
    },
    {
      retries: Math.max((policy.maxAttempts ?? 1) - 1, 0),
      factor: 1,
      minTimeout: policy.intervalMs,
      maxTimeout: policy.intervalMs,
      randomize: false,
      signal: masterAbort.signal,
      onFailedAttempt: async (error) => {
        if (masterAbort.signal.aborted || terminalReason) return;
        if (
          policy.timeoutMs != null &&
          Date.now() - startedAt + policy.intervalMs >= policy.timeoutMs
        ) {
          terminalReason = "timeout";
          return;
        }
        if (error.retriesLeft <= 0) {
          terminalReason = "max_attempts";
          return;
        }
        emitTimeline({
          eventKind: "poll_wait",
          status: "paused",
          attemptNumber: error.attemptNumber,
          sequenceNumber: snapshot.stepIndex + error.attemptNumber / 100 + 0.0005,
          summary: `Waiting ${policy.intervalMs}ms before retry`,
          outcome: "waiting",
        });
      },
    },
  )
    .then((result) => {
      emitTimeline({
        eventKind: "poll_terminal",
        status: "completed",
        attemptNumber: lastAttemptNumber,
        sequenceNumber: snapshot.stepIndex + 0.999,
        summary: `Polling succeeded after ${lastAttemptNumber} attempt${lastAttemptNumber === 1 ? "" : "s"}`,
        terminal: terminalReason ?? "success_condition",
      });
      response = result;
    })
    .catch((error: unknown) => {
      if (masterAbort.signal.aborted) {
        thrownError = new Error("Request aborted");
        return;
      }
      const reason = terminalReason ?? "max_attempts";
      emitTimeline({
        eventKind: "poll_terminal",
        status: "failed",
        attemptNumber: lastAttemptNumber,
        sequenceNumber: snapshot.stepIndex + 0.999,
        summary: getPollingFailureSummary(reason),
        terminal: reason,
        outcome: "failed",
      });
      thrownError =
        error instanceof Error
          ? new Error(getPollingFailureMessage(reason))
          : new Error("Polling failed");
    })
    .finally(() => {
      done = true;
      notify?.();
      notify = null;
    });

  const iterator = (async function* (): AsyncGenerator<PipelineExecutionEvent, AsyncStepResult> {
    while (!done || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          notify = resolve;
        });
        continue;
      }
      const event = queue.shift();
      if (event) yield event;
    }

    await task;
    if (thrownError) throw thrownError;
    return { response, snapshot, runtimeVariables };
  })();

  return { iterator };
}
