import { DEFAULT_PROMPTS } from "@/features/pipeline/ai-constants";
import type { FormDataField, Pipeline, PipelineStep } from "@/types";

type PersistedPipelineStep = Omit<PipelineStep, "formDataFields"> & {
  formDataFields?: Array<Omit<FormDataField, "file">>;
};

type PersistedPipelineData = Omit<
  Pipeline,
  "steps" | "narrativeConfig" | "createdAt" | "updatedAt"
> & {
  flowDocument?: Pipeline["flowDocument"];
  steps: PersistedPipelineStep[];
  narrativeConfig: {
    tone: Pipeline["narrativeConfig"]["tone"];
    prompt: string;
    enabled: boolean;
    length?: Pipeline["narrativeConfig"]["length"];
  };
};

export function sanitizePipelineForDb(pipeline: Pipeline): PersistedPipelineData {
  return {
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description,
    flowDocument: pipeline.flowDocument,
    generationMetadata: pipeline.generationMetadata,
    steps: pipeline.steps.map((step) => sanitizePipelineStep(step)),
    narrativeConfig: {
      tone: pipeline.narrativeConfig.tone,
      prompt: pipeline.narrativeConfig.prompt,
      enabled: pipeline.narrativeConfig.enabled,
      length: pipeline.narrativeConfig.length,
    },
  };
}

export function hydratePipelineFromDb(
  data: Partial<PersistedPipelineData> & Pick<Pipeline, "id" | "name">,
  createdAt?: string,
  updatedAt?: string,
): Pipeline {
  const tone = data.narrativeConfig?.tone ?? "technical";
  const prompt = data.narrativeConfig?.prompt ?? DEFAULT_PROMPTS[tone];

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    flowDocument: data.flowDocument,
    generationMetadata: data.generationMetadata,
    steps: (data.steps ?? []).map((step) => ({
      ...step,
      formDataFields: step.formDataFields?.map((field) => stripClientFile(field)) ?? [],
    })),
    narrativeConfig: {
      tone,
      prompt,
      enabled: data.narrativeConfig?.enabled ?? true,
      length: data.narrativeConfig?.length ?? "medium",
      promptOverrides: { ...DEFAULT_PROMPTS, [tone]: prompt },
    },
    createdAt: createdAt ?? new Date().toISOString(),
    updatedAt: updatedAt ?? new Date().toISOString(),
  };
}

function sanitizePipelineStep(step: PipelineStep): PersistedPipelineStep {
  return {
    ...step,
    formDataFields: step.formDataFields?.map((field) => stripClientFile(field)),
  };
}

function stripClientFile(field: FormDataField): Omit<FormDataField, "file"> {
  const { file: _file, ...rest } = field;
  return rest;
}
