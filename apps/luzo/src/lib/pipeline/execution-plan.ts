import type { PipelineStep } from "@/types";
import { validatePipelineDag } from "./dag-validator";

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
  const validation = validatePipelineDag(steps);
  const adjacency = validation.adjacency ?? new Map<string, string[]>();
  const stepNames = new Map(steps.map((step) => [step.id, step.name || "Untitled request"]));
  const issuesByStep = new Map<string, string[]>();
  const depthByStep = new Map<string, number>();

  for (const error of validation.errors) {
    if (!error.stepId) continue;
    issuesByStep.set(error.stepId, [...(issuesByStep.get(error.stepId) ?? []), error.message]);
  }

  for (const step of steps) {
    const deps = adjacency.get(step.id) ?? [];
    const depth =
      deps.length > 0 ? Math.max(...deps.map((id) => (depthByStep.get(id) ?? 0) + 1)) : 0;
    depthByStep.set(step.id, depth);
  }

  const depthCounts = steps.reduce((counts, step) => {
    const depth = depthByStep.get(step.id) ?? 0;
    counts.set(depth, (counts.get(depth) ?? 0) + 1);
    return counts;
  }, new Map<number, number>());

  return new Map<string, PipelineExecutionLayout>(
    steps.map((step) => {
      const issues = unique(issuesByStep.get(step.id) ?? []);
      const depth = depthByStep.get(step.id) ?? 0;
      const parallelGroup = (depthCounts.get(depth) ?? 0) > 1;

      if (issues.length > 0) {
        return [
          step.id,
          {
            depth,
            groupLabel: "Needs review",
            mode: "review",
            parallelGroup: false,
            detail: issues[0] ?? "Review this step's dependencies.",
          },
        ];
      }

      const deps = adjacency.get(step.id) ?? [];
      if (deps.length > 0) {
        return [
          step.id,
          {
            depth,
            groupLabel: parallelGroup ? `Parallel group ${depth + 1}` : `Stage ${depth + 1}`,
            mode: "sequential",
            parallelGroup,
            detail: `Waits for ${deps.map((id) => stepNames.get(id) ?? "another step").join(", ")}`,
          },
        ];
      }

      return [
        step.id,
        {
          depth,
          groupLabel: parallelGroup ? "Parallel group 1" : "Stage 1",
          mode: "parallel",
          parallelGroup,
          detail: "No upstream dependencies detected.",
        },
      ];
    }),
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
