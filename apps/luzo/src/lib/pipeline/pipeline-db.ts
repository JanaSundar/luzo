import {
  createFlowDocumentFromSteps,
  ensureFlowDocument,
} from "@/features/flow-editor/domain/flow-document";
import { compileFlowDocumentToPipelineSteps } from "@/features/flow-editor/domain/flow-runtime";
import type { FlowDocument } from "@/features/flow-editor/domain/types";
import { DEFAULT_PROMPTS } from "@/lib/pipeline/ai-constants";
import type { FormDataField, Pipeline, PipelineStep } from "@/types";

type PersistedPipelineStep = Omit<PipelineStep, "formDataFields"> & {
  formDataFields?: Array<Omit<FormDataField, "file">>;
};

type PersistedPipelineData = Omit<
  Pipeline,
  "steps" | "narrativeConfig" | "createdAt" | "updatedAt"
> & {
  flow?: FlowDocument;
  steps?: PersistedPipelineStep[];
  narrativeConfig: {
    tone: Pipeline["narrativeConfig"]["tone"];
    prompt: string;
    enabled: boolean;
    length?: Pipeline["narrativeConfig"]["length"];
  };
};

export function sanitizePipelineForDb(pipeline: Pipeline): PersistedPipelineData {
  const flow = ensureFlowDocument(pipeline.flow, pipeline.steps);
  return {
    id: pipeline.id,
    flow,
    name: pipeline.name,
    description: pipeline.description,
    generationMetadata: pipeline.generationMetadata,
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

  const legacySteps = (data.steps ?? []).map((step) => ({
    ...step,
    formDataFields: step.formDataFields?.map((field) => stripClientFile(field)) ?? [],
  }));
  const flow = data.flow
    ? ensureFlowDocument(data.flow, legacySteps)
    : createFlowDocumentFromSteps(legacySteps);

  return {
    id: data.id,
    flow,
    name: data.name,
    description: data.description,
    generationMetadata: data.generationMetadata,
    steps: compileFlowDocumentToPipelineSteps(flow),
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
function stripClientFile(field: FormDataField): Omit<FormDataField, "file"> {
  const { file: _file, ...rest } = field;
  return rest;
}
