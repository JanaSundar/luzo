"use client";

import type { JsonWorkerApi } from "@/types/workers";
import { createComlinkWorker } from "./create-comlink-worker";

export const jsonWorkerClient = createComlinkWorker<JsonWorkerApi>({
  createWorker: () =>
    new Worker(new URL("../json/json-worker.ts", import.meta.url), { type: "module" }),
});
