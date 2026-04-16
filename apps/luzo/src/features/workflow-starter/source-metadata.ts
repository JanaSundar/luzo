import type { GenerationSourceMetadata, TemplateDefinition } from "@/types";

export function createTemplateGenerationSource(
  template: TemplateDefinition,
): GenerationSourceMetadata {
  return {
    label: template.name,
    requestCountHint: template.pipelineDefinition.steps.length,
    sourceType: template.sourceType === "builtin" ? "builtin_template" : "saved_template",
    templateId: template.id,
    templateName: template.name,
    templateSourceType: template.sourceType,
  };
}

export function createCurlGenerationSource(label = "Imported cURL"): GenerationSourceMetadata {
  return {
    label,
    requestCountHint: 1,
    sourceType: "curl",
  };
}

export function createPromptGenerationSource(
  label: string,
  promptSummary: string,
  requestCountHint?: number,
): GenerationSourceMetadata {
  return {
    label,
    promptSummary,
    requestCountHint,
    sourceType: "prompt",
  };
}
