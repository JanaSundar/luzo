import * as Comlink from "comlink";
import { runWorkerTask } from "@/workers/shared/run-worker-task";
import { computeGraphFocus } from "@/features/workflow/analysis/graph-focus";
import { compileExecutionPlan } from "@/features/workflow/compiler/compileExecutionPlan";
import { buildWorkflowDefinition } from "@/features/workflow/normalize/buildWorkflowDefinition";
import { normalizeFlowDocument } from "@/features/workflow/normalize/normalizeFlowDocument";
import { validateWorkflowDag } from "@/features/workflow/validation/validateWorkflowDag";
import type { GraphWorkerApi } from "@/types/workers";

const api: GraphWorkerApi = {
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

Comlink.expose(api);
