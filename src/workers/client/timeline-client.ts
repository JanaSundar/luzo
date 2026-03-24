import type { TimelineWorkerApi } from "@/types/workers";
import { runWorkerTask } from "@/workers/shared/run-worker-task";
import { createComlinkWorker } from "./create-comlink-worker";

export const timelineWorkerClient = createComlinkWorker<TimelineWorkerApi>(async () => {
  const [
    { buildTimelineIndex },
    { deriveReplayStateAt },
    { filterTimeline },
    { syncTimeline },
    { getPipelineExecutionLayout },
  ] = await Promise.all([
    import("@/features/timeline/buildTimelineIndex"),
    import("@/features/timeline/deriveReplayStateAt"),
    import("@/features/timeline/filterTimeline"),
    import("@/features/timeline/syncTimeline"),
    import("@/features/pipeline/execution-plan"),
  ]);

  return {
    async buildTimelineIndex(input) {
      return runWorkerTask(async () => buildTimelineIndex(input));
    },
    async filterTimeline(input) {
      return runWorkerTask(async () => filterTimeline(input));
    },
    async deriveReplayStateAt(input) {
      return runWorkerTask(async () => deriveReplayStateAt(input));
    },
    async syncTimeline(input) {
      return runWorkerTask(async () => {
        const layoutMap = getPipelineExecutionLayout(input.steps);
        const layoutByStep = Object.fromEntries(layoutMap.entries());
        return syncTimeline({
          snapshots: input.snapshots,
          executionId: input.executionId,
          layoutByStep,
        });
      });
    },
  };
});
