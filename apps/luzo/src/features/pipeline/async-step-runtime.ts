import type { HttpMethod, TestRule } from "@/types";
import type { TimelineEvent, TimelineEventKind, TimelineEventStatus } from "@/types/timeline-event";
import type { StepSnapshot } from "@/types/pipeline-runtime";
import type { NormalizedResponse } from "./generator-executor-shared";

export function evaluateRules(response: NormalizedResponse, rules: TestRule[] = []) {
  if (rules.length === 0) return false;
  return rules.every((rule) => evaluateRule(response, rule));
}

export async function sleepWithAbort(ms: number, signal: AbortSignal) {
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(new Error("Request aborted"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function appendTimelineEvent(snapshot: StepSnapshot, event: TimelineEvent): StepSnapshot {
  return {
    ...snapshot,
    timelineEvents: [
      ...(snapshot.timelineEvents ?? []).filter((item) => item.eventId !== event.eventId),
      event,
    ],
  };
}

export function createAsyncTimelineEvent({
  executionId,
  snapshot,
  eventKind,
  status,
  sequenceNumber,
  attemptNumber,
  summary,
  terminalReason,
  outcome,
  metadata,
}: {
  executionId: string;
  snapshot: StepSnapshot;
  eventKind: TimelineEventKind;
  status: TimelineEventStatus;
  sequenceNumber: number;
  attemptNumber?: number | null;
  summary?: string | null;
  terminalReason?: string | null;
  outcome?: TimelineEvent["outcome"];
  metadata?: Record<string, unknown> | null;
}): TimelineEvent {
  return {
    eventId: `${executionId}:${snapshot.stepId}:${eventKind}:${attemptNumber ?? "base"}:${sequenceNumber}`,
    executionId,
    eventKind,
    stepId: snapshot.stepId,
    stepName: snapshot.stepName,
    sourceStepId: snapshot.stepId,
    targetStepId: snapshot.stepId,
    routeSemantics: null,
    skippedReason: null,
    lineagePath: snapshot.stepId,
    outcome: outcome ?? "executed",
    attemptNumber: attemptNumber ?? null,
    terminalReason: terminalReason ?? null,
    summary: summary ?? null,
    metadata: metadata ?? null,
    stageIndex: snapshot.stepIndex,
    branchId: null,
    status,
    method: snapshot.method,
    url: snapshot.url,
    timestamp: Date.now(),
    startedAt: Date.now(),
    endedAt: eventKind === "poll_wait" || eventKind === "webhook_wait" ? null : Date.now(),
    durationMs: eventKind === "poll_wait" || eventKind === "webhook_wait" ? null : 0,
    sequenceNumber,
    retryCount: Math.max((attemptNumber ?? 1) - 1, 0),
    inputSnapshot: null,
    outputSnapshot: null,
    errorSnapshot: null,
    httpStatus: null,
    responseSize: null,
    isMock: false,
    preRequestPassed: null,
    postRequestPassed: null,
    testsPassed: null,
  };
}

function evaluateRule(response: NormalizedResponse, rule: TestRule) {
  const left = getRuleValue(response, rule);

  switch (rule.operator) {
    case "exists":
      return left != null;
    case "not_exists":
      return left == null;
    case "greater_than":
      return Number(left) > Number(rule.value ?? 0);
    case "less_than":
      return Number(left) < Number(rule.value ?? 0);
    case "contains":
      return String(left ?? "").includes(rule.value ?? "");
    case "not_contains":
      return !String(left ?? "").includes(rule.value ?? "");
    case "not_equals":
      return String(left ?? "") !== String(rule.value ?? "");
    case "equals":
    default:
      return String(left ?? "") === String(rule.value ?? "");
  }
}

function getRuleValue(response: NormalizedResponse, rule: TestRule) {
  switch (rule.target) {
    case "status_code":
      return response.status;
    case "response_time":
      return response.time;
    case "body_contains":
      return response.body;
    case "header":
      return response.headers[rule.property ?? ""];
    case "json_property":
      return getNestedValue(parseJson(response.body), rule.property);
    default:
      return null;
  }
}

function getNestedValue(input: unknown, property?: string) {
  if (!property) return null;
  return property.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return null;
    return (acc as Record<string, unknown>)[key];
  }, input);
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function createWebhookEndpointUrl({ token }: { token: string }) {
  if (typeof window === "undefined") return `/api/webhooks/${token}`;
  return `${window.location.origin}/api/webhooks/${token}`;
}

export function createStepScopedRuntimeKey(stepId: string, field: "webhookUrl" | "webhookToken") {
  return `luzo.${stepId}.${field}`;
}

export function buildRequestLikeInput(snapshot: StepSnapshot) {
  return {
    method: snapshot.method as HttpMethod,
    url: snapshot.resolvedRequest.url,
    headers: snapshot.resolvedRequest.headers,
    body: snapshot.resolvedRequest.body,
  };
}
