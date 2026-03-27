import * as Comlink from "comlink";
import { runWorkerTask } from "@/workers/shared/run-worker-task";
import { diffJsonPayloads, transformLargePayload } from "@/features/workflow/json/json-transforms";
import type { JsonWorkerApi } from "@/types/workers";

const api: JsonWorkerApi = {
  async diffJsonPayloads(input) {
    return runWorkerTask(async () => diffJsonPayloads(input));
  },
  async transformLargePayload(input) {
    return runWorkerTask(async () => transformLargePayload(input));
  },
  async tryBuildJsonDocument({ text }) {
    const { tryBuildJsonDocument: build } = await import("@/features/json-view/buildJsonDocument");
    return runWorkerTask(async () => build(text));
  },
};

Comlink.expose(api);
