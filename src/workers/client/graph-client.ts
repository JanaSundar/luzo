"use client";

import type { GraphWorkerApi } from "@/types/workers";
import { createComlinkWorker } from "./create-comlink-worker";

export const graphWorkerClient = createComlinkWorker<GraphWorkerApi>({
  createWorker: () =>
    new Worker(new URL("../graph/graph-worker.ts", import.meta.url), { type: "module" }),
});
