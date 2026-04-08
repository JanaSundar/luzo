import type { ReplayStateAtOutput } from "@/types/worker-results";
import type { TimelineEvent } from "@/types/timeline-event";
import type { TimelineIndex } from "@/types/workflow";

export interface ReplayStateAtInput {
  index: TimelineIndex;
  timestamp: number;
}

export function deriveReplayStateAt(input: ReplayStateAtInput): ReplayStateAtOutput {
  const events: TimelineEvent[] = [];
  const latestByStepId: Record<string, TimelineEvent> = {};

  for (const eventId of input.index.orderedEventIds) {
    const event = input.index.byId[eventId];
    if (!event || event.timestamp > input.timestamp) break;
    events.push(event);
    latestByStepId[event.stepId] = event;
  }

  return {
    timestamp: input.timestamp,
    events,
    latestByStepId,
  };
}
