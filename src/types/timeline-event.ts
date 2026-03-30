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

export type TimelineEventKind =
  | "request"
  | "route_selected"
  | "step_skipped"
  | "poll_attempt"
  | "poll_wait"
  | "poll_terminal"
  | "webhook_wait"
  | "webhook_matched"
  | "webhook_timeout"
  | "webhook_ignored";
export type TimelineEventOutcome =
  | "executed"
  | "selected"
  | "skipped"
  | "failed"
  | "waiting"
  | "matched"
  | "timed_out";

// ─── Event ──────────────────────────────────────────────────────────
export interface TimelineEvent {
  /** Unique event id (derived from stepId + executionId) */
  eventId: string;
  executionId: string;
  eventKind?: TimelineEventKind;
  stepId: string;
  stepName: string;
  sourceStepId?: string | null;
  targetStepId?: string | null;
  routeSemantics?: "control" | "success" | "failure" | "true" | "false" | null;
  skippedReason?: string | null;
  lineagePath?: string | null;
  outcome?: TimelineEventOutcome;
  attemptNumber?: number | null;
  terminalReason?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;

  /** DAG depth — steps at the same depth can run in parallel */
  stageIndex: number;
  /** Non-null when the step belongs to a parallel group */
  branchId: string | null;

  status: TimelineEventStatus;
  method: HttpMethod;
  url: string;

  /** Wall-clock epoch when the event was first observed */
  timestamp: number;
  startedAt: number | null;
  endedAt: number | null;
  durationMs: number | null;

  /** Deterministic sort key: stageIndex * 1000 + stepIndex */
  sequenceNumber: number;

  retryCount: number;

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
}

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
