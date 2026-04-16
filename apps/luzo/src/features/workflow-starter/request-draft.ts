import { validateGenerationDraft } from "@/features/collection-to-pipeline/draft-validation";
import type {
  ApiRequest,
  GenerationExplanation,
  GenerationSourceMetadata,
  InferredDependency,
  PipelineGenerationDraft,
  PipelineGenerationStepDraft,
} from "@/types";

export function createDraftFromRequests(params: {
  explanations?: string[];
  requests: ApiRequest[];
  source: GenerationSourceMetadata;
  warnings?: string[];
}) {
  const steps = params.requests.map<PipelineGenerationStepDraft>((request, index) => ({
    explanations: [],
    generatedName: deriveStepName(request, index),
    grouping: "sequential",
    id: `${params.source.sourceType}-step-${index + 1}`,
    originalRequest: request,
    request: structuredClone(request),
    sourceName: deriveStepName(request, index),
    sourceRequestId: `${params.source.sourceType}-${index + 1}`,
    unresolved: [],
    warnings: [],
  }));
  const validated = validateGenerationDraft(steps);

  return {
    dependencies: buildDependencies(validated.steps, validated.validation.adjacency),
    explanations: buildExplanations(
      validated.steps,
      validated.validation.errors,
      params.explanations,
    ),
    source: params.source,
    steps: validated.steps,
    validation: validated.validation,
    warnings: params.warnings ?? [],
  } satisfies PipelineGenerationDraft;
}

function buildDependencies(
  steps: PipelineGenerationStepDraft[],
  adjacency: Record<string, string[]>,
): InferredDependency[] {
  return Object.entries(adjacency).flatMap(([stepId, dependencyIds]) =>
    dependencyIds.map((fromStepId) => {
      const from = steps.find((step) => step.id === fromStepId);
      const to = steps.find((step) => step.id === stepId);
      return {
        applied: true,
        confidence: "explicit" as const,
        fromStepId,
        id: `${fromStepId}-${stepId}`,
        reason: `${to?.generatedName ?? "Step"} runs after ${from?.generatedName ?? "the previous step"} because it references upstream output.`,
        toStepId: stepId,
      };
    }),
  );
}

function buildExplanations(
  steps: PipelineGenerationStepDraft[],
  errors: PipelineGenerationDraft["validation"]["errors"],
  details: string[] | undefined,
) {
  const base: GenerationExplanation[] = (details ?? []).map((detail, index) => ({
    detail,
    stepId: steps[index]?.id ?? steps[0]?.id ?? "generated-step-1",
    tone: "info" as const,
  }));

  return [
    ...base,
    ...errors.map((error) => ({
      detail: error.message,
      stepId: error.stepId,
      tone: "warning" as const,
    })),
  ];
}

function deriveStepName(request: ApiRequest, index: number) {
  if (request.auth.type === "bearer" && request.auth.bearer?.token?.includes("req1")) {
    return "Use Authenticated Request";
  }
  const path = request.url.split("?")[0]?.split("/").filter(Boolean).at(-1);
  if (path) {
    return `${request.method} ${path.replace(/[-_]/g, " ")}`.replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    );
  }
  return `Request ${index + 1}`;
}
