import type { AnalysisWorkerApi } from "@/types/workers";
import { runWorkerTask } from "@/workers/shared/run-worker-task";
import { createComlinkWorker } from "./create-comlink-worker";

export const analysisWorkerClient = createComlinkWorker<AnalysisWorkerApi>(async () => {
  const [{ analyzeVariables }, { getAutocompleteSuggestions }, { rebuildRuntimeVariables }] =
    await Promise.all([
      import("@/features/workflow/analysis/analyzeVariables"),
      import("@/features/pipeline/autocomplete"),
      import("@/features/pipeline/execution-artifacts"),
    ]);

  return {
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
});
