import { validatePipelineDag } from "@/lib/pipeline/dag-validator";
import type { DraftValidationResult, PipelineGenerationStepDraft, PreviewGrouping } from "@/types";
import { groupStepsByDepth, toPipelineSteps } from "./analysis-helpers";

export function validateGenerationDraft(
  steps: PipelineGenerationStepDraft[],
  preferredOrder?: string[],
): DraftValidationResult {
  const orderedSteps = sortByPreferredOrder(steps, preferredOrder);
  const validation = validatePipelineDag(toPipelineSteps(orderedSteps));
  const adjacency = Object.fromEntries(
    Array.from(validation.adjacency?.entries() ?? []).map(([stepId, deps]) => [stepId, deps]),
  );
  const sortedIds = validation.sortedStepIds ?? orderedSteps.map((step) => step.id);
  const depth = groupStepsByDepth(sortedIds, adjacency);
  const nextSteps = sortedIds
    .map((stepId) => orderedSteps.find((step) => step.id === stepId))
    .filter((step): step is PipelineGenerationStepDraft => Boolean(step))
    .map((step) => ({
      ...step,
      grouping: (depth.get(step.id) ?? 0) === 0 ? "parallel" : ("sequential" as PreviewGrouping),
    }));

  return {
    steps: nextSteps,
    validation: {
      adjacency,
      errors: validation.errors,
      sortedStepIds: sortedIds,
      valid: validation.valid,
    },
  };
}

function sortByPreferredOrder(steps: PipelineGenerationStepDraft[], preferredOrder?: string[]) {
  if (!preferredOrder?.length) return steps;
  const order = new Map(preferredOrder.map((stepId, index) => [stepId, index]));
  return [...steps].sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
}
