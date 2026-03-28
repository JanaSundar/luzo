import * as Comlink from "comlink";
import { getAutocompleteSuggestions } from "@/features/pipeline/autocomplete-core";
import { rebuildRuntimeVariables } from "@/features/pipeline/execution-artifacts";
import { runWorkerTask } from "@/workers/shared/run-worker-task";
import { analyzeVariables } from "@/features/workflow/analysis/analyzeVariables";
import type { AnalysisWorkerApi } from "@/types/workers";

const api: AnalysisWorkerApi = {
  async analyzeVariables(input) {
    return runWorkerTask(async () => analyzeVariables(input));
  },
  async buildVariableSuggestions(input) {
    return runWorkerTask(async () =>
      getAutocompleteSuggestions(
        input.pipeline,
        input.currentStepId,
        input.envVars,
        input.executionContext,
      ),
    );
  },
  async rebuildRuntimeVariables(input) {
    return runWorkerTask(async () =>
      rebuildRuntimeVariables(input.pipeline, input.snapshots, input.upToIndex),
    );
  },
};

Comlink.expose(api);
