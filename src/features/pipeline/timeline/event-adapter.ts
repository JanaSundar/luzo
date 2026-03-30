import type { PipelineExecutionLayout } from "@/features/pipeline/execution-plan";
import type { StepSnapshot, StepStatus } from "@/types/pipeline-runtime";
import type { CompiledPipelineNode } from "@/types/workflow";
import type {
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
  const stageIndex = layout?.depth ?? 0;
  const isParallel = layout?.parallelGroup ?? false;

  return {
    eventId: `${executionId}:${snapshot.stepId}`,
    executionId,
    eventKind: "request",
    stepId: snapshot.stepId,
    stepName: snapshot.stepName,
    sourceStepId: snapshot.stepId,
    targetStepId: snapshot.stepId,
    routeSemantics: null,
    skippedReason: null,
    lineagePath: snapshot.highlightPath ?? snapshot.stepId,
    outcome: snapshot.status === "error" ? "failed" : "executed",
    attemptNumber: null,
    terminalReason: null,
    summary: null,
    metadata: null,
    subflowInstanceId: snapshot.subflowSource?.subflowInstanceId ?? null,
    subflowDefinitionId: snapshot.subflowSource?.subflowDefinitionId ?? null,
    subflowDefinitionVersion: snapshot.subflowSource?.subflowDefinitionVersion ?? null,
    subflowName: snapshot.subflowSource?.subflowName ?? null,
    subflowDepth: snapshot.subflowSource?.subflowDepth ?? null,

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
    postRequestPassed: snapshot.postRequestResult
      ? snapshot.postRequestResult.status === "success" && !snapshot.postRequestResult.error
      : null,
    testsPassed: snapshot.testResult
      ? snapshot.testResult.status === "success" && !snapshot.testResult.error
      : null,
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
  planNodes: CompiledPipelineNode[] = [],
): TimelineEvent[] {
  const baseEvents = snapshots.map((snapshot) =>
    snapshotToTimelineEvent(snapshot, executionId, layoutByStep.get(snapshot.stepId)),
  );
  const asyncEvents = snapshots.flatMap((snapshot) => snapshot.timelineEvents ?? []);
  const planNodeById = new Map(planNodes.map((node) => [node.nodeId, node]));

  for (const snapshot of snapshots) {
    const planNode = planNodeById.get(snapshot.stepId);
    if (!planNode) continue;

    const succeeded = snapshot.status === "success" || snapshot.status === "done";
    const failed = snapshot.status === "error";
    if (!succeeded && !failed) continue;

    const chosenSemantics = failed ? "failure" : "success";
    const chosenTarget =
      chosenSemantics === "failure" ? planNode.routes.failure[0] : planNode.routes.success[0];
    const skippedTarget =
      chosenSemantics === "failure" ? planNode.routes.success[0] : planNode.routes.failure[0];
    const sourceEvent = baseEvents.find((event) => event.stepId === snapshot.stepId);
    if (!sourceEvent) continue;

    if (chosenTarget) {
      baseEvents.push({
        ...sourceEvent,
        eventId: `${executionId}:${snapshot.stepId}:route:${chosenSemantics}`,
        eventKind: "route_selected",
        stepId: snapshot.stepId,
        stepName: snapshot.stepName,
        sourceStepId: snapshot.stepId,
        targetStepId: chosenTarget,
        routeSemantics: chosenSemantics,
        lineagePath: `${snapshot.stepId}:${chosenSemantics}:${chosenTarget}`,
        outcome: "selected",
        sequenceNumber: sourceEvent.sequenceNumber + 0.1,
        inputSnapshot: null,
        outputSnapshot: null,
        errorSnapshot: null,
      });
    }

    if (skippedTarget) {
      const skippedNode = planNodeById.get(skippedTarget);
      baseEvents.push({
        ...sourceEvent,
        eventId: `${executionId}:${snapshot.stepId}:skipped:${skippedTarget}`,
        eventKind: "step_skipped",
        stepId: skippedTarget,
        stepName: skippedNode?.nodeId ?? skippedTarget,
        sourceStepId: snapshot.stepId,
        targetStepId: skippedTarget,
        routeSemantics: chosenSemantics === "failure" ? "success" : "failure",
        skippedReason: "branch_not_taken",
        lineagePath: `${snapshot.stepId}:skipped:${skippedTarget}`,
        outcome: "skipped",
        status: "skipped",
        sequenceNumber: sourceEvent.sequenceNumber + 0.2,
        startedAt: snapshot.completedAt,
        endedAt: snapshot.completedAt,
        durationMs: 0,
        inputSnapshot: null,
        outputSnapshot: null,
        errorSnapshot: null,
        httpStatus: null,
        responseSize: null,
        preRequestPassed: null,
        postRequestPassed: null,
        testsPassed: null,
      });
    }
  }

  return [...baseEvents, ...asyncEvents];
}
