import * as Comlink from "comlink";
import { runWorkerTask } from "@/workers/shared/run-worker-task";
import { buildTimelineIndex } from "@/features/timeline/buildTimelineIndex";
import { deriveReplayStateAt } from "@/features/timeline/deriveReplayStateAt";
import { filterTimeline } from "@/features/timeline/filterTimeline";
import type { TimelineWorkerApi } from "@/types/workers";
import { syncTimeline } from "@/features/timeline/syncTimeline";

const api: TimelineWorkerApi = {
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
    const { getPipelineExecutionLayout } = await import("@/features/pipeline/execution-plan");
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

Comlink.expose(api);
