import type { JsonWorkerApi } from "@/types/workers";
import { runWorkerTask } from "@/workers/shared/run-worker-task";
import { createComlinkWorker } from "./create-comlink-worker";

export const jsonWorkerClient = createComlinkWorker<JsonWorkerApi>(async () => {
  const [{ diffJsonPayloads, transformLargePayload }, { tryBuildJsonDocument }] = await Promise.all(
    [
      import("@/features/workflow/json/json-transforms"),
      import("@/features/json-view/buildJsonDocument"),
    ],
  );

  return {
    async diffJsonPayloads(input) {
      return runWorkerTask(async () => diffJsonPayloads(input));
    },
    async transformLargePayload(input) {
      return runWorkerTask(async () => transformLargePayload(input));
    },
    async tryBuildJsonDocument({ text }) {
      return runWorkerTask(async () => tryBuildJsonDocument(text));
    },
  };
});
