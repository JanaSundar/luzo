import type { PipelineStep } from "@/types";
import type { StepAlias } from "@/types/pipeline-runtime";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildAliasesFromSteps(steps: PipelineStep[]): StepAlias[] {
  const slugCounts = new Map<string, number>();
  const slugs = steps.map((step) => {
    const slug = slugify(step.name || "");
    if (slug) slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
    return slug;
  });

  return steps.map((step, index) => ({
    stepId: step.id,
    alias: `req${index + 1}`,
    index,
    refs: [
      `req${index + 1}`,
      step.id,
      ...(slugs[index] && slugCounts.get(slugs[index]) === 1 ? [slugs[index]] : []),
    ],
  }));
}

export function buildAliasesFromNodeIds(nodeIds: string[]): StepAlias[] {
  return nodeIds.map((stepId, index) => ({
    stepId,
    alias: `req${index + 1}`,
    index,
    refs: [`req${index + 1}`, stepId],
  }));
}
