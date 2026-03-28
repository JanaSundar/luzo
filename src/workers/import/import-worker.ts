import * as Comlink from "comlink";
import { runWorkerTask } from "@/workers/shared/run-worker-task";
import { parseImportSource } from "@/features/workflow/import/parseImportSource";
import type { ImportWorkerApi } from "@/types/workers";

const api: ImportWorkerApi = {
  async parseImportSource(input) {
    return runWorkerTask(async () => parseImportSource(input));
  },
};

Comlink.expose(api);
