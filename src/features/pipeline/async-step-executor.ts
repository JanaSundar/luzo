import type { PipelineStep } from "@/types";
import type { PipelineExecutionEvent, StepSnapshot } from "@/types/pipeline-runtime";
import { useSettingsStore } from "@/stores/useSettingsStore";
import {
  createAsyncTimelineEvent,
  createStepScopedRuntimeKey,
  createWebhookEndpointUrl,
  sleepWithAbort,
  appendTimelineEvent,
} from "./async-step-runtime";
import type { NormalizedResponse } from "./generator-executor-shared";
import { runPollingWithRetry } from "./polling-retry-runner";
import { createWebhookToken } from "./webhook-token";
import { createWebhookWait, readWebhookWait } from "./webhook-wait-client";

interface AsyncStepResult {
  response: NormalizedResponse;
  snapshot: StepSnapshot;
  runtimeVariables: Record<string, unknown>;
}

export async function* resolveAsyncStepPolicies(params: {
  executionId: string;
  step: PipelineStep;
  snapshot: StepSnapshot;
  response: NormalizedResponse;
  runtimeVariables: Record<string, unknown>;
  envVariables: Record<string, string>;
  masterAbort: AbortController;
}): AsyncGenerator<PipelineExecutionEvent, AsyncStepResult, Record<string, string> | undefined> {
  const { executionId, step, envVariables, masterAbort } = params;
  let { snapshot, response, runtimeVariables } = params;

  if (step.pollingPolicy?.enabled) {
    const pollingResult = runPollingWithRetry({
      executionId,
      step,
      snapshot,
      response,
      runtimeVariables,
      envVariables,
      masterAbort,
    });
    let next = await pollingResult.iterator.next();
    while (!next.done) {
      if (next.value.type === "timeline_event" && next.value.snapshot) {
        snapshot = next.value.snapshot;
      }
      yield next.value;
      next = await pollingResult.iterator.next();
    }
    snapshot = next.value.snapshot;
    response = next.value.response;
    runtimeVariables = next.value.runtimeVariables;
  }

  if (step.webhookWaitPolicy?.enabled) {
    const dbUrl = useSettingsStore.getState().dbUrl.trim();
    if (!dbUrl) throw new Error("Connect a database before using webhook waits");
    if (!step.webhookWaitPolicy.correlationKeyTemplate.trim()) {
      throw new Error("Webhook wait requires a correlation value");
    }

    const endpointId = `${executionId}:${step.id}`;
    const endpointToken = createWebhookToken(dbUrl, endpointId);
    const endpointUrl = createWebhookEndpointUrl({ token: endpointToken });
    runtimeVariables[createStepScopedRuntimeKey(step.id, "webhookUrl")] = endpointUrl;
    runtimeVariables[createStepScopedRuntimeKey(step.id, "webhookToken")] = endpointToken;

    const waitCreated = await createWebhookWait({
      dbUrl,
      executionId,
      stepId: step.id,
      endpointId,
      endpointToken,
      endpointUrl,
      correlationKey: step.webhookWaitPolicy.correlationKeyTemplate,
      policy: step.webhookWaitPolicy,
    });

    const waitingEvent = createAsyncTimelineEvent({
      executionId,
      snapshot,
      eventKind: "webhook_wait",
      status: "paused",
      sequenceNumber: snapshot.stepIndex + 0.8,
      summary: `Waiting for webhook callback`,
      outcome: "waiting",
      metadata: { endpointUrl },
    });
    snapshot = appendTimelineEvent(snapshot, waitingEvent);
    yield { type: "timeline_event", event: waitingEvent, snapshot, runtimeVariables };

    const deadline = Date.now() + step.webhookWaitPolicy.timeoutMs;
    while (Date.now() < deadline) {
      await sleepWithAbort(step.webhookWaitPolicy.pollIntervalMs, masterAbort.signal);
      const current = await readWebhookWait({ dbUrl, waitId: waitCreated.wait.id });
      if (current.wait?.status === "matched") {
        runtimeVariables[`${step.id}.webhook`] = current.wait.matchedPayload ?? {};
        const matchedEvent = createAsyncTimelineEvent({
          executionId,
          snapshot,
          eventKind: "webhook_matched",
          status: "completed",
          sequenceNumber: snapshot.stepIndex + 0.81,
          summary: "Webhook received and correlated",
          outcome: "matched",
          metadata: { endpointUrl, matchedEventId: current.wait.matchedEventId ?? null },
        });
        snapshot = appendTimelineEvent(snapshot, matchedEvent);
        yield { type: "timeline_event", event: matchedEvent, snapshot, runtimeVariables };
        return { response, snapshot, runtimeVariables };
      }
      if (current.wait?.status === "timeout") break;
    }

    const timeoutEvent = createAsyncTimelineEvent({
      executionId,
      snapshot,
      eventKind: "webhook_timeout",
      status: "failed",
      sequenceNumber: snapshot.stepIndex + 0.82,
      summary: "Webhook wait timed out",
      terminalReason: "timeout",
      outcome: "timed_out",
      metadata: { endpointUrl },
    });
    snapshot = appendTimelineEvent(snapshot, timeoutEvent);
    yield { type: "timeline_event", event: timeoutEvent, snapshot, runtimeVariables };
    throw new Error("Webhook wait timed out");
  }

  return { response, snapshot, runtimeVariables };
}
