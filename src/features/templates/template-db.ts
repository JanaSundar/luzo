import type { TemplateDefinition } from "@/types";
import { hydratePipelineFromDb, sanitizePipelineForDb } from "@/features/pipeline/pipeline-db";

type PersistedTemplateData = Omit<TemplateDefinition, "pipelineDefinition"> & {
  pipelineDefinition: ReturnType<typeof sanitizePipelineForDb>;
};

export function sanitizeTemplateForDb(template: TemplateDefinition): PersistedTemplateData {
  return {
    ...template,
    pipelineDefinition: sanitizePipelineForDb(template.pipelineDefinition),
  };
}

export function hydrateTemplateFromDb(
  data: Partial<PersistedTemplateData> &
    Pick<TemplateDefinition, "id" | "name" | "category" | "complexity" | "sourceType">,
  createdAt?: string,
  updatedAt?: string,
): TemplateDefinition {
  const templateCreatedAt = createdAt ?? data.createdAt ?? new Date().toISOString();
  const templateUpdatedAt = updatedAt ?? data.updatedAt ?? new Date().toISOString();

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    category: data.category,
    tags: data.tags ?? [],
    complexity: data.complexity,
    sourceType: data.sourceType,
    pipelineDefinition: hydratePipelineFromDb(
      data.pipelineDefinition ?? { id: data.id, name: data.name, steps: [] },
      templateCreatedAt,
      templateUpdatedAt,
    ),
    inputSchema: data.inputSchema ?? [],
    sampleOutputs: data.sampleOutputs ?? [],
    assumptions: data.assumptions ?? [],
    createdAt: templateCreatedAt,
    updatedAt: templateUpdatedAt,
  };
}
