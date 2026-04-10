"use client";

import type { ImportWorkerApi } from "@/types/workers";
import { createComlinkWorker } from "./create-comlink-worker";

export const importWorkerClient = createComlinkWorker<ImportWorkerApi>({
  createWorker: () =>
    new Worker(new URL("../import/import-worker.ts", import.meta.url), { type: "module" }),
});
