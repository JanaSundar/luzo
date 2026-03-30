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
    byStepId[event.stepId] ??= [];
    byStepId[event.stepId].push(event.eventId);
    byNodeId[event.targetStepId ?? event.stepId] ??= [];
    byNodeId[event.targetStepId ?? event.stepId].push(event.eventId);
    byStatus[event.status].push(event.eventId);

    if (event.branchId) {
      byBranchId[event.branchId] ??= [];
      byBranchId[event.branchId].push(event.eventId);
    }

    const attemptKey = `${event.stepId}:${event.retryCount}`;
    byAttempt[attemptKey] ??= [];
    byAttempt[attemptKey].push(event.eventId);

    if (event.outcome) {
      byOutcome[event.outcome] ??= [];
      byOutcome[event.outcome].push(event.eventId);
    }

    if (event.lineagePath) {
      byLineagePath[event.lineagePath] ??= [];
      byLineagePath[event.lineagePath].push(event.eventId);
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
