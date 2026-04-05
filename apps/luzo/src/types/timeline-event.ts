import type { HttpMethod } from ".";

// ─── Status ─────────────────────────────────────────────────────────
export type TimelineEventStatus =
  | "queued"
  | "ready"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "retried"
  | "skipped";

export type TimelineEventKind = "request" | "condition" | "wait";
export type TimelineNodeKind = "request" | "ai" | "evaluate" | "wait" | "unknown";
export type TimelineConditionResultKind = "true" | "false" | "match" | "no-match" | "error";
export type TimelineRouteSkipReason =
  | "not-selected"
  | "missing-match"
  | "upstream-not-reached"
  | "condition-error";

export interface TimelineRouteDecision {
  routeKind: "request-outcome";
  chosenRouteId: string | null;
  chosenHandleId: string | null;
  skippedRouteIds: string[];
}

interface TimelineEventBase {
  /** Unique event id (derived from stepId + executionId) */
  eventId: string;
  executionId: string;
  stepId: string;
  stepName: string;
  eventKind: TimelineEventKind;
  nodeKind: TimelineNodeKind;

  /** DAG depth — steps at the same depth can run in parallel */
  stageIndex: number;
  /** Non-null when the step belongs to a parallel group */
  branchId: string | null;

  status: TimelineEventStatus;

  /** Wall-clock epoch when the event was first observed */
  timestamp: number;
  startedAt: number | null;
  endedAt: number | null;
  durationMs: number | null;

  /** Deterministic sort key used for stable ordering in the timeline */
  sequenceNumber: number;

  retryCount: number;
}

// ─── Request event ──────────────────────────────────────────────────
export interface RequestTimelineEvent extends TimelineEventBase {
  eventKind: "request";
  nodeKind: "request" | "ai" | "unknown";
  method: HttpMethod;
  url: string;
  // ── Snapshot payloads ──
  inputSnapshot: TimelineInputSnapshot | null;
  outputSnapshot: TimelineOutputSnapshot | null;
  errorSnapshot: TimelineErrorSnapshot | null;

  /** HTTP status code — extracted for quick badge rendering */
  httpStatus: number | null;
  responseSize: number | null;
  isMock: boolean;

  /** Pre-request and test script results */
  preRequestPassed: boolean | null;
  postRequestPassed?: boolean | null;
  testsPassed: boolean | null;
  routeDecision?: TimelineRouteDecision | null;
}

// ─── Condition event ────────────────────────────────────────────────
export interface ConditionTimelineEvent extends TimelineEventBase {
  eventKind: "condition";
  nodeKind: "evaluate";
  conditionId: string;
  conditionNodeId: string;
  conditionType: "if" | "switch" | "foreach";
  expression: string | null;
  expressionSummary: string;
  resultKind: TimelineConditionResultKind | null;
  resultLabel: string | null;
  chosenRouteId: string | null;
  chosenHandleId: string | null;
  chosenTargetNodeId: string | null;
  skippedRouteIds: string[];
  skippedTargetNodeIds: string[];
  skipReasonByRouteId: Record<string, TimelineRouteSkipReason>;
  affectedExecutedNodeIds: string[];
  affectedSkippedNodeIds: string[];
  sharedDownstreamNodeIds: string[];
  upstreamRequestEventId: string | null;
  resolvedAt: number | null;
  routeDecisionKey: string;
}

// ─── Wait event placeholder ─────────────────────────────────────────
export interface WaitTimelineEvent extends TimelineEventBase {
  eventKind: "wait";
  nodeKind: "wait";
  label: string;
  reason: string | null;
}

export type TimelineEvent = RequestTimelineEvent | ConditionTimelineEvent | WaitTimelineEvent;

// ─── Snapshot sub-types ─────────────────────────────────────────────
export interface TimelineInputSnapshot {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: string | null;
}

export interface TimelineOutputSnapshot {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string | null;
  latencyMs: number;
  sizeBytes: number;
}

export interface TimelineErrorSnapshot {
  message: string;
  stepId: string;
  stepName: string;
}

export function isRequestTimelineEvent(event: TimelineEvent): event is RequestTimelineEvent {
  return event.eventKind === "request";
}

export function isConditionTimelineEvent(event: TimelineEvent): event is ConditionTimelineEvent {
  return event.eventKind === "condition";
}
