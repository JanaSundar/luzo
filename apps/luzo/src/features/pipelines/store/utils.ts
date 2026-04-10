import type { Pipeline } from "@/types";

export function findPipelineStep(pipelines: Pipeline[], pipelineId: string, stepId: string) {
  const pipeline = pipelines.find((entry) => entry.id === pipelineId);
  if (!pipeline) return null;
  const index = pipeline.steps.findIndex((step) => step.id === stepId);
  if (index === -1) return null;
  return { pipeline, step: pipeline.steps[index], index };
}
