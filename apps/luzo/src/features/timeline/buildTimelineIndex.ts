import type { TimelineEvent } from "@/types/timeline-event";
import type { TimelineIndex } from "@/types/workflow";

export interface BuildTimelineIndexInput {
  executionId: string;
  events: TimelineEvent[];
}

export function buildTimelineIndex(input: BuildTimelineIndexInput): TimelineIndex {
  const orderedEvents = [...input.events].sort((a, b) => {
    const sequenceDiff = a.sequenceNumber - b.sequenceNumber;
    if (sequenceDiff !== 0) return sequenceDiff;
    return a.eventId.localeCompare(b.eventId);
  });

  const byId: TimelineIndex["byId"] = {};
  const byStepId: TimelineIndex["byStepId"] = {};
  const byNodeId: TimelineIndex["byNodeId"] = {};
  const byStatus: TimelineIndex["byStatus"] = {
    queued: [],
    ready: [],
    running: [],
    paused: [],
    completed: [],
    failed: [],
    retried: [],
    skipped: [],
  };
  const byBranchId: TimelineIndex["byBranchId"] = {};
  const byAttempt: TimelineIndex["byAttempt"] = {};
  const byOutcome: TimelineIndex["byOutcome"] = {};
  const byLineagePath: TimelineIndex["byLineagePath"] = {};

  let min: number | null = null;
  let max: number | null = null;

  for (const event of orderedEvents) {
    byId[event.eventId] = event;
    const stepEvents = byStepId[event.stepId] ?? [];
    stepEvents.push(event.eventId);
    byStepId[event.stepId] = stepEvents;

    const nodeId = event.targetStepId ?? event.stepId;
    const nodeEvents = byNodeId[nodeId] ?? [];
    nodeEvents.push(event.eventId);
    byNodeId[nodeId] = nodeEvents;

    const statusEvents = byStatus[event.status];
    byStatus[event.status] = [...statusEvents, event.eventId];

    if (event.branchId) {
      const branchEvents = byBranchId[event.branchId] ?? [];
      branchEvents.push(event.eventId);
      byBranchId[event.branchId] = branchEvents;
    }

    const attemptKey = `${event.stepId}:${event.retryCount}`;
    const attemptEvents = byAttempt[attemptKey] ?? [];
    attemptEvents.push(event.eventId);
    byAttempt[attemptKey] = attemptEvents;

    if (event.outcome) {
      const outcomeEvents = byOutcome[event.outcome] ?? [];
      outcomeEvents.push(event.eventId);
      byOutcome[event.outcome] = outcomeEvents;
    }

    if (event.lineagePath) {
      const lineageEvents = byLineagePath[event.lineagePath] ?? [];
      lineageEvents.push(event.eventId);
      byLineagePath[event.lineagePath] = lineageEvents;
    }

    min = min == null ? event.timestamp : Math.min(min, event.timestamp);
    max = max == null ? event.timestamp : Math.max(max, event.timestamp);
  }

  return {
    executionId: input.executionId,
    orderedEventIds: orderedEvents.map((event) => event.eventId),
    byId,
    byStepId,
    byNodeId,
    byStatus,
    byBranchId,
    byAttempt,
    byOutcome,
    byLineagePath,
    timeBounds: { min, max },
  };
}
