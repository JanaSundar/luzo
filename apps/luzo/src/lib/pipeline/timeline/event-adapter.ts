import type { PipelineExecutionLayout } from "@/lib/pipeline/execution-plan";
import type { StepSnapshot, StepStatus } from "@/types/pipeline-runtime";
import type {
  ConditionTimelineEvent,
  TimelineErrorSnapshot,
  TimelineEvent,
  TimelineEventStatus,
  TimelineInputSnapshot,
  TimelineOutputSnapshot,
} from "@/types/timeline-event";
import { computeDuration } from "./format-utils";

// ─── Status mapping ─────────────────────────────────────────────────
// Maps the transport-level StepStatus to the timeline's canonical status.
// Single place for this mapping — no duplication allowed.

const STEP_STATUS_TO_TIMELINE: Record<StepStatus, TimelineEventStatus> = {
  idle: "queued",
  step_ready: "ready",
  running: "running",
  success: "completed",
  error: "failed",
  done: "completed",
};

export function mapStepStatus(status: StepStatus): TimelineEventStatus {
  return STEP_STATUS_TO_TIMELINE[status];
}

// ─── Snapshot extractors ────────────────────────────────────────────

function extractInput(snapshot: StepSnapshot): TimelineInputSnapshot {
  return {
    method: snapshot.resolvedRequest.method,
    url: snapshot.resolvedRequest.url,
    headers: snapshot.resolvedRequest.headers,
    body: snapshot.resolvedRequest.body,
  };
}

function extractOutput(snapshot: StepSnapshot): TimelineOutputSnapshot | null {
  const r = snapshot.reducedResponse;
  if (!r) return null;
  return {
    status: r.status,
    statusText: r.statusText,
    headers: snapshot.fullHeaders ?? r.headers,
    body: snapshot.fullBody ?? null,
    latencyMs: r.latencyMs,
    sizeBytes: r.sizeBytes,
  };
}

function extractError(snapshot: StepSnapshot): TimelineErrorSnapshot | null {
  if (!snapshot.error) return null;
  return {
    message: snapshot.error,
    stepId: snapshot.stepId,
    stepName: snapshot.stepName,
  };
}

// ─── Adapter ────────────────────────────────────────────────────────

/**
 * Converts a StepSnapshot (transport shape) into a TimelineEvent (UI shape).
 *
 * sequenceNumber = stageIndex * 1000 + stepIndex
 * This gives deterministic, stable ordering:
 * - Steps in earlier stages sort first
 * - Within a stage, steps sort by their pipeline position
 * - Factor of 1000 allows up to 999 steps per stage without collision
 *
 * @param snapshot - Source step snapshot from the execution engine
 * @param executionId - Current execution session id
 * @param layout - Optional execution layout for stage/branch metadata
 */
export function snapshotToTimelineEvent(
  snapshot: StepSnapshot,
  executionId: string,
  layout?: PipelineExecutionLayout,
): TimelineEvent {
  if (snapshot.entryType === "condition") {
    return snapshotToConditionTimelineEvent(snapshot, executionId, layout);
  }

  const stageIndex = layout?.depth ?? 0;
  const isParallel = layout?.parallelGroup ?? false;

  return {
    eventId: `${executionId}:${snapshot.stepId}`,
    executionId,
    stepId: snapshot.stepId,
    stepName: snapshot.stepName,
    eventKind: "request",
    nodeKind: "unknown",

    stageIndex,
    branchId: isParallel ? `stage-${stageIndex}` : null,

    status: mapStepStatus(snapshot.status),
    method: snapshot.method,
    url: snapshot.url,

    timestamp: snapshot.startedAt ?? Date.now(),
    startedAt: snapshot.startedAt,
    endedAt: snapshot.completedAt,
    durationMs: computeDuration(snapshot.startedAt, snapshot.completedAt),

    sequenceNumber: stageIndex * 1000 + snapshot.stepIndex,
    retryCount: 0,

    inputSnapshot: extractInput(snapshot),
    outputSnapshot: extractOutput(snapshot),
    errorSnapshot: extractError(snapshot),

    httpStatus: snapshot.reducedResponse?.status ?? null,
    responseSize: snapshot.reducedResponse?.sizeBytes ?? null,
    isMock: (snapshot.fullHeaders ?? snapshot.reducedResponse?.headers)?.["x-luzo-mock"] === "true",

    preRequestPassed: snapshot.preRequestResult
      ? snapshot.preRequestResult.status === "success" && !snapshot.preRequestResult.error
      : null,
    testsPassed: snapshot.testResult
      ? snapshot.testResult.status === "success" && !snapshot.testResult.error
      : null,
    routeDecision: snapshot.routeDecision
      ? {
          routeKind: "request-outcome",
          chosenRouteId: snapshot.routeDecision.chosenRouteId,
          chosenHandleId: snapshot.routeDecision.chosenHandleId,
          skippedRouteIds: snapshot.routeDecision.skippedRouteIds,
        }
      : null,
  };
}

function snapshotToConditionTimelineEvent(
  snapshot: StepSnapshot,
  executionId: string,
  layout?: PipelineExecutionLayout,
): ConditionTimelineEvent {
  const stageIndex = layout?.depth ?? 0;
  const decision = snapshot.conditionDecision;
  const resultKind =
    decision?.error != null
      ? "error"
      : decision?.result == null
        ? null
        : decision.result
          ? "true"
          : "false";

  return {
    eventId: `${executionId}:${snapshot.stepId}`,
    executionId,
    stepId: snapshot.stepId,
    stepName: snapshot.stepName,
    eventKind: "condition",
    nodeKind: "evaluate",
    stageIndex,
    branchId: null,
    status: mapStepStatus(snapshot.status),
    timestamp: snapshot.startedAt ?? Date.now(),
    startedAt: snapshot.startedAt,
    endedAt: snapshot.completedAt,
    durationMs: computeDuration(snapshot.startedAt, snapshot.completedAt),
    sequenceNumber: stageIndex * 1000 + snapshot.stepIndex,
    retryCount: 0,
    conditionId: snapshot.stepId,
    conditionNodeId: snapshot.stepId,
    conditionType: "if",
    expression: decision?.expression ?? snapshot.resolvedRequest.body ?? null,
    expressionSummary: decision?.expression ?? snapshot.stepName,
    resultKind,
    resultLabel:
      decision?.error != null
        ? "Error"
        : decision?.result == null
          ? null
          : decision.result
            ? "True"
            : "False",
    chosenRouteId: decision?.chosenRouteId ?? null,
    chosenHandleId: decision?.chosenHandleId ?? null,
    chosenTargetNodeId: decision?.chosenTargetNodeId ?? null,
    skippedRouteIds: decision?.skippedRouteIds ?? [],
    skippedTargetNodeIds: [],
    skipReasonByRouteId: {},
    affectedExecutedNodeIds: [],
    affectedSkippedNodeIds: [],
    sharedDownstreamNodeIds: [],
    upstreamRequestEventId: null,
    resolvedAt: snapshot.completedAt,
    routeDecisionKey: `${executionId}:${snapshot.stepId}:${decision?.chosenRouteId ?? "pending"}`,
  };
}

/**
 * Batch-converts an array of snapshots into timeline events.
 * O(n) — single pass, no sorting needed (sequenceNumber encodes order).
 */
export function snapshotsToTimelineEvents(
  snapshots: StepSnapshot[],
  executionId: string,
  layoutByStep: Map<string, PipelineExecutionLayout>,
): TimelineEvent[] {
  return snapshots.map((snapshot) =>
    snapshotToTimelineEvent(snapshot, executionId, layoutByStep.get(snapshot.stepId)),
  );
}
