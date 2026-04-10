import type { PipelineExecutionEvent, StepAlias, StepSnapshot } from "@/types/pipeline-runtime";
import type { WebhookWaitNodeConfig } from "@/types/workflow";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { cloneRuntimeVariables } from "./generator-executor-shared";
import { cloneSnapshot } from "./pipeline-snapshot-utils";
import {
  appendTimelineEvent,
  createAsyncTimelineEvent,
  createWebhookEndpointUrl,
  sleepWithAbort,
} from "./async-step-runtime";
import { createWebhookToken } from "./webhook-token";
import { createWebhookWait, readWebhookWait } from "./webhook-wait-client";

const WEBHOOK_WAIT_METHOD = "GET" as const;
const WEBHOOK_WAIT_URL = "";
const DEFAULT_TIMEOUT_MS = 300_000; // 5 minutes
const POLL_INTERVAL_MS = 2_000;

function createWebhookWaitSnapshot(
  nodeId: string,
  label: string,
  orderIndex: number,
  runtimeVariables: Record<string, unknown>,
): StepSnapshot {
  return {
    stepId: nodeId,
    stepIndex: orderIndex,
    stepName: label || "Webhook Wait",
    entryType: "condition",
    method: WEBHOOK_WAIT_METHOD,
    url: WEBHOOK_WAIT_URL,
    resolvedRequest: {
      method: WEBHOOK_WAIT_METHOD,
      url: WEBHOOK_WAIT_URL,
      headers: {},
      body: null,
    },
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
 * Executes a WebhookWait node. Creates a webhook endpoint, exposes the URL in
 * runtime variables as `<runtimeRef>.webhookUrl`, then polls until a matching event
 * arrives or the timeout elapses.
 *
 * Reuses the same webhook-wait infrastructure used by request-level webhook policies.
 * No new backend infrastructure needed — canvas UX completion as per the roadmap.
 */
export async function* executeWebhookWaitGenerator(params: {
  nodeId: string;
  orderIndex: number;
  webhookWaitConfig: WebhookWaitNodeConfig;
  webhookAlias: StepAlias;
  runtimeVariables: Record<string, unknown>;
  snapshots: StepSnapshot[];
  executionId: string;
  masterAbort: AbortController;
}): AsyncGenerator<PipelineExecutionEvent, void, Record<string, string> | undefined> {
  const {
    nodeId,
    orderIndex,
    webhookAlias,
    webhookWaitConfig,
    runtimeVariables,
    snapshots,
    executionId,
    masterAbort,
  } = params;

  let snapshot = createWebhookWaitSnapshot(
    nodeId,
    webhookWaitConfig.label,
    orderIndex,
    runtimeVariables,
  );
  snapshots.push(snapshot);
  const snapshotIndex = snapshots.length - 1;

  const dbUrl = useSettingsStore.getState().dbUrl.trim();
  if (!dbUrl) {
    const errMsg = "Connect a database before using WebhookWait nodes";
    snapshot = { ...snapshot, status: "error", error: errMsg, completedAt: Date.now() };
    snapshots[snapshotIndex] = snapshot;
    yield {
      type: "step_failed",
      snapshot: cloneSnapshot(snapshot),
      runtimeVariables: cloneRuntimeVariables(runtimeVariables),
    } satisfies PipelineExecutionEvent;
    return;
  }

  const endpointId = `${executionId}:${nodeId}`;
  const endpointToken = createWebhookToken(dbUrl, endpointId);
  const endpointUrl = createWebhookEndpointUrl({ token: endpointToken });

  assignWebhookRuntimeFields(runtimeVariables, webhookAlias, {
    webhookToken: endpointToken,
    webhookUrl: endpointUrl,
  });

  const correlationKey = webhookWaitConfig.correlationKey?.trim() || endpointId;
  const timeoutMs = webhookWaitConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const policy = {
    enabled: true,
    correlationKeyTemplate: correlationKey,
    timeoutMs,
    pollIntervalMs: POLL_INTERVAL_MS,
    correlationSource: "body" as const,
    correlationField: "id",
  };
  const waitCreated = await createWebhookWait({
    dbUrl,
    executionId,
    stepId: nodeId,
    endpointId,
    endpointToken,
    endpointUrl,
    correlationKey,
    policy,
  });

  const waitingEvent = createAsyncTimelineEvent({
    executionId,
    snapshot,
    eventKind: "webhook_wait",
    status: "paused",
    sequenceNumber: orderIndex + 0.8,
    summary: "Waiting for webhook callback",
    outcome: "waiting",
    metadata: { endpointUrl },
  });
  snapshot = appendTimelineEvent(snapshot, waitingEvent);
  yield { type: "timeline_event", event: waitingEvent, snapshot, runtimeVariables };

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleepWithAbort(POLL_INTERVAL_MS, masterAbort.signal);
    const current = await readWebhookWait({ dbUrl, waitId: waitCreated.wait.id });
    if (current.wait?.status === "matched") {
      const payload = current.wait.matchedPayload ?? {};
      assignWebhookRuntimeFields(runtimeVariables, webhookAlias, {
        output: payload,
        payload,
      });
      const matchedEvent = createAsyncTimelineEvent({
        executionId,
        snapshot,
        eventKind: "webhook_matched",
        status: "completed",
        sequenceNumber: orderIndex + 0.81,
        summary: "Webhook received and correlated",
        outcome: "matched",
        metadata: { endpointUrl, matchedEventId: current.wait.matchedEventId ?? null },
      });
      snapshot = appendTimelineEvent(snapshot, matchedEvent);
      yield { type: "timeline_event", event: matchedEvent, snapshot, runtimeVariables };

      snapshot = { ...snapshot, status: "done", completedAt: Date.now() };
      snapshots[snapshotIndex] = snapshot;
      yield {
        type: "step_completed",
        snapshot: cloneSnapshot(snapshot),
        runtimeVariables: cloneRuntimeVariables(runtimeVariables),
      } satisfies PipelineExecutionEvent;
      return;
    }
    if (current.wait?.status === "timeout") break;
  }

  const timeoutEvent = createAsyncTimelineEvent({
    executionId,
    snapshot,
    eventKind: "webhook_timeout",
    status: "failed",
    sequenceNumber: orderIndex + 0.82,
    summary: "Webhook wait timed out",
    terminalReason: "timeout",
    outcome: "timed_out",
    metadata: { endpointUrl },
  });
  snapshot = appendTimelineEvent(snapshot, timeoutEvent);
  yield { type: "timeline_event", event: timeoutEvent, snapshot, runtimeVariables };

  snapshot = {
    ...snapshot,
    status: "error",
    error: "Webhook wait timed out",
    completedAt: Date.now(),
  };
  snapshots[snapshotIndex] = snapshot;
  yield {
    type: "step_failed",
    snapshot: cloneSnapshot(snapshot),
    runtimeVariables: cloneRuntimeVariables(runtimeVariables),
  } satisfies PipelineExecutionEvent;
}

function assignWebhookRuntimeFields(
  runtimeVariables: Record<string, unknown>,
  webhookAlias: StepAlias,
  patch: Record<string, unknown>,
) {
  webhookAlias.refs.forEach((ref) => {
    const current =
      runtimeVariables[ref] && typeof runtimeVariables[ref] === "object"
        ? (runtimeVariables[ref] as Record<string, unknown>)
        : {};
    runtimeVariables[ref] = { ...current, ...patch };
  });
}
