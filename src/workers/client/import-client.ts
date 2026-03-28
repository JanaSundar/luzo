import type { ImportWorkerApi } from "@/types/workers";
import { runWorkerTask } from "@/workers/shared/run-worker-task";
import { createComlinkWorker } from "./create-comlink-worker";

export const importWorkerClient = createComlinkWorker<ImportWorkerApi>(async () => {
  const { parseImportSource } = await import("@/features/workflow/import/parseImportSource");

  return {
    async parseImportSource(input) {
      return runWorkerTask(async () => parseImportSource(input));
    },
  };
});
