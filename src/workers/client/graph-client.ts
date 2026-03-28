import type { GraphWorkerApi } from "@/types/workers";
import { runWorkerTask } from "@/workers/shared/run-worker-task";
import { createComlinkWorker } from "./create-comlink-worker";

export const graphWorkerClient = createComlinkWorker<GraphWorkerApi>(async () => {
  const [
    { computeGraphFocus },
    { compileExecutionPlan },
    { buildWorkflowDefinition },
    { normalizeFlowDocument },
    { validateWorkflowDag },
  ] = await Promise.all([
    import("@/features/workflow/analysis/graph-focus"),
    import("@/features/workflow/compiler/compileExecutionPlan"),
    import("@/features/workflow/normalize/buildWorkflowDefinition"),
    import("@/features/workflow/normalize/normalizeFlowDocument"),
    import("@/features/workflow/validation/validateWorkflowDag"),
  ]);

  return {
    async normalizeFlowDocument({ flow }) {
      return runWorkerTask(async () => normalizeFlowDocument(flow));
    },
    async buildWorkflowDefinition(input) {
      return runWorkerTask(async () => buildWorkflowDefinition(input));
    },
    async validateWorkflowDag(input) {
      return runWorkerTask(async () => validateWorkflowDag(input.workflow));
    },
    async compileExecutionPlan(input) {
      return runWorkerTask(async () => compileExecutionPlan(input));
    },
    async computeGraphFocus(input) {
      return runWorkerTask(async () => computeGraphFocus(input));
    },
  };
});
