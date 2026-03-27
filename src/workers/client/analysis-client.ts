import type { AnalysisWorkerApi } from "@/types/workers";
import { createComlinkWorker } from "./create-comlink-worker";

export const analysisWorkerClient = createComlinkWorker<AnalysisWorkerApi>(
  () =>
    new Worker(new URL("../analysis/analysis-worker.ts", import.meta.url), {
      type: "module",
    }),
);
