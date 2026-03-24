import { snapshotsToTimelineEvents } from "@/features/pipeline/timeline/event-adapter";
import type { PipelineExecutionLayout } from "@/features/pipeline/execution-plan";
import type { StepSnapshot } from "@/types/pipeline-runtime";
import type { TimelineIndex } from "@/types/workflow";
import { buildTimelineIndex } from "./buildTimelineIndex";

export interface SyncTimelineInput {
  snapshots: StepSnapshot[];
  executionId: string;
  layoutByStep: Record<string, PipelineExecutionLayout>;
}

export function syncTimeline(input: SyncTimelineInput): TimelineIndex {
  const { snapshots, executionId, layoutByStep } = input;

  const layoutMap = new Map(Object.entries(layoutByStep));

  const events = snapshotsToTimelineEvents(snapshots, executionId, layoutMap);

  return buildTimelineIndex({
    executionId,
    events,
  });
}
