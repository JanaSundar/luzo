import type { Pipeline } from "@/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildPipelineStepNameMap(pipeline: Pipeline | null) {
  return new Map((pipeline?.steps ?? []).map((step) => [step.id, step.name]));
}

export function resolveTimelineDisplayName(params: {
  stepId?: string | null;
  fallback?: string | null;
  stepNameById: Map<string, string>;
  unnamedLabel?: string;
}) {
  const { stepId, fallback, stepNameById, unnamedLabel = "Unnamed step" } = params;
  const pipelineName = stepId ? stepNameById.get(stepId) : null;
  const candidate = pipelineName ?? fallback ?? null;

  if (!candidate) {
    return unnamedLabel;
  }

  if (stepId && candidate === stepId) {
    return unnamedLabel;
  }

  if (UUID_PATTERN.test(candidate.trim())) {
    return unnamedLabel;
  }

  return candidate;
}
