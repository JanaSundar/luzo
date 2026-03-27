import type { TimelineWorkerApi } from "@/types/workers";
import { createComlinkWorker } from "./create-comlink-worker";

export const timelineWorkerClient = createComlinkWorker<TimelineWorkerApi>(
  () =>
    new Worker(new URL("../timeline/timeline-worker.ts", import.meta.url), {
      type: "module",
    }),
);
