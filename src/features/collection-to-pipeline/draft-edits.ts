import type { PipelineGenerationDraft, PreviewGrouping } from "@/types";
import { validateGenerationDraft } from "./draft-validation";

export function renameDraftStep(draft: PipelineGenerationDraft, stepId: string, name: string) {
  return revalidate({
    ...draft,
    steps: draft.steps.map((step) =>
      step.id === stepId ? { ...step, generatedName: name.trim() || step.generatedName } : step,
    ),
  });
}

export function removeDraftStep(draft: PipelineGenerationDraft, stepId: string) {
  const dependencies = draft.dependencies.filter(
    (dependency) => dependency.fromStepId !== stepId && dependency.toStepId !== stepId,
  );
  return revalidate({
    ...draft,
    dependencies,
    steps: draft.steps.filter((step) => step.id !== stepId),
  });
}

export function moveDraftStep(
  draft: PipelineGenerationDraft,
  stepId: string,
  direction: "up" | "down",
) {
  const steps = [...draft.steps];
  const index = steps.findIndex((step) => step.id === stepId);
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= steps.length) return draft;
  [steps[index], steps[nextIndex]] = [steps[nextIndex], steps[index]];
  return revalidate({ ...draft, steps });
}

export function setDraftGrouping(
  draft: PipelineGenerationDraft,
  stepId: string,
  grouping: PreviewGrouping,
) {
  return revalidate({
    ...draft,
    steps: draft.steps.map((step) => (step.id === stepId ? { ...step, grouping } : step)),
  });
}

export function ignoreDraftDependency(draft: PipelineGenerationDraft, dependencyId: string) {
  return {
    ...draft,
    dependencies: draft.dependencies.map((dependency) =>
      dependency.id === dependencyId ? { ...dependency, ignored: true } : dependency,
    ),
  };
}

function revalidate(draft: PipelineGenerationDraft): PipelineGenerationDraft {
  const validated = validateGenerationDraft(
    draft.steps,
    draft.steps.map((step) => step.id),
  );
  return {
    ...draft,
    steps: validated.steps,
    validation: validated.validation,
  };
}
