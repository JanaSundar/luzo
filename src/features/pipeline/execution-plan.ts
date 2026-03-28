import type { PipelineStep } from "@/types";
import { buildWorkflowBundleFromPipeline } from "@/features/workflow/pipeline-adapters";
import { compileExecutionPlan } from "@/features/workflow/compiler/compileExecutionPlan";

export interface PipelineExecutionHint {
  detail: string;
  mode: "parallel" | "review" | "sequential";
}

export interface PipelineExecutionLayout extends PipelineExecutionHint {
  depth: number;
  groupLabel: string;
  parallelGroup: boolean;
}

export function getPipelineExecutionHints(steps: PipelineStep[]) {
  return new Map(
    Array.from(getPipelineExecutionLayout(steps), ([stepId, layout]) => [
      stepId,
      { mode: layout.mode, detail: layout.detail } satisfies PipelineExecutionHint,
    ]),
  );
}

export function getPipelineExecutionLayout(steps: PipelineStep[]) {
  const bundle = buildWorkflowBundleFromPipeline({
    id: "pipeline",
    name: "Pipeline",
    steps,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    narrativeConfig: {
      tone: "technical",
      prompt: "",
      enabled: true,
      length: "medium",
      promptOverrides: undefined,
    },
  });
  const { plan, warnings } = compileExecutionPlan({
    workflow: bundle.workflow,
    registry: bundle.registry,
  });
  const warningByStep = new Map<string, string[]>();

  for (const warning of warnings) {
    if (!warning.stepId) continue;
    warningByStep.set(warning.stepId, [
      ...(warningByStep.get(warning.stepId) ?? []),
      warning.message,
    ]);
  }

  return new Map(
    plan.nodes.map((node) => {
      const issues = warningByStep.get(node.nodeId) ?? [];
      const parallelGroup = (plan.stages[node.stageIndex]?.nodeIds.length ?? 0) > 1;

      return [
        node.nodeId,
        {
          depth: node.stageIndex,
          groupLabel: parallelGroup
            ? `Parallel group ${node.stageIndex + 1}`
            : `Stage ${node.stageIndex + 1}`,
          mode: issues.length > 0 ? "review" : parallelGroup ? "parallel" : "sequential",
          parallelGroup,
          detail:
            issues[0] ??
            (node.dependencyIds.length > 0
              ? `Waits for ${node.dependencyIds.join(", ")}`
              : "No upstream dependencies detected."),
        } satisfies PipelineExecutionLayout,
      ];
    }),
  );
}
