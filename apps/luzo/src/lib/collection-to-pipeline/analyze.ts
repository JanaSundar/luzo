import { buildStepAliases } from "@/lib/pipeline/dag-validator";
import { extractVariableRefs } from "@/lib/pipeline/variable-resolver";
import type {
  GenerationExplanation,
  InferredDependency,
  NormalizedCollectionInput,
  PipelineGenerationDraft,
  PipelineGenerationStepDraft,
  UnresolvedVariable,
} from "@/types";
import {
  createDraftStepName,
  getPrimaryResourceKey,
  getProducedKeys,
  getTemplateFields,
  isAuthRequest,
  toPipelineSteps,
} from "./analysis-helpers";
import { validateGenerationDraft } from "./draft-validation";

export function analyzeCollectionToDraft(
  input: NormalizedCollectionInput,
): PipelineGenerationDraft {
  const baseSteps = input.requests.map<PipelineGenerationStepDraft>((request, index) => ({
    explanations: [],
    generatedName: createDraftStepName(request.sourceName, request.request),
    grouping: "sequential",
    id: `draft-step-${index + 1}`,
    originalRequest: request.request,
    request: structuredClone(request.request),
    sourceName: request.sourceName,
    sourceRequestId: request.sourceRequestId,
    unresolved: [],
    warnings: [...request.warnings],
  }));
  const aliases = buildStepAliases(toPipelineSteps(baseSteps));
  const producedByKey = buildProducedByKey(baseSteps);
  const dependencies: InferredDependency[] = [];
  const explanations: GenerationExplanation[] = [];

  for (const step of baseSteps) {
    const rewrite = rewriteStep(step, baseSteps, aliases, producedByKey);
    step.request = rewrite.request;
    step.unresolved = rewrite.unresolved;
    step.explanations = rewrite.explanations;
    dependencies.push(...rewrite.dependencies);
    explanations.push(
      ...rewrite.explanations.map((detail) => ({ detail, stepId: step.id, tone: "info" as const })),
    );
  }

  const validation = validateGenerationDraft(baseSteps);
  return {
    dependencies,
    explanations: [...explanations, ...toValidationExplanations(validation.validation.errors)],
    source: input.source,
    steps: validation.steps,
    validation: validation.validation,
    warnings: input.warnings,
  };
}

function rewriteStep(
  step: PipelineGenerationStepDraft,
  steps: PipelineGenerationStepDraft[],
  aliases: ReturnType<typeof buildStepAliases>,
  producedByKey: Map<string, Array<{ key: string; stepId: string }>>,
) {
  const request = structuredClone(step.request);
  const unresolved: UnresolvedVariable[] = [];
  const dependencies: InferredDependency[] = [];
  const explanations: string[] = [];
  const currentIndex = steps.findIndex((entry) => entry.id === step.id);

  for (const { field, value } of getTemplateFields(request)) {
    let nextValue = value;
    for (const variable of extractVariableRefs(value)) {
      if (variable.startsWith("req")) continue;
      const match = producedByKey
        .get(variable.toLowerCase())
        ?.find(
          (candidate) => steps.findIndex((entry) => entry.id === candidate.stepId) < currentIndex,
        );
      if (!match) {
        unresolved.push(createUnresolved(step.id, field, variable, producedByKey));
        continue;
      }
      const alias = aliases.find((entry) => entry.stepId === match.stepId)?.alias;
      if (!alias) continue;
      const rewritten = `{{${alias}.response.body.${match.key}}}`;
      nextValue = nextValue.replace(`{{${variable}}}`, rewritten);
      dependencies.push({
        applied: true,
        confidence: isAuthVariable(variable) ? "high" : "explicit",
        fromStepId: match.stepId,
        id: `${match.stepId}-${step.id}-${variable}`,
        reason: dependencyReason(steps, match.stepId, step.id, variable),
        toStepId: step.id,
        variable,
      });
      explanations.push(dependencyReason(steps, match.stepId, step.id, variable));
    }
    applyFieldValue(request, field, nextValue);
  }

  return {
    dependencies,
    explanations: dedupe(explanations),
    request,
    unresolved: dedupeUnresolved(unresolved),
  };
}

function buildProducedByKey(steps: PipelineGenerationStepDraft[]) {
  const producedByKey = new Map<string, Array<{ key: string; stepId: string }>>();
  for (const step of steps) {
    for (const key of getProducedKeys(step.request)) {
      const existing = producedByKey.get(key.toLowerCase()) ?? [];
      producedByKey.set(key.toLowerCase(), [...existing, { key, stepId: step.id }]);
    }
    const resourceKey = getPrimaryResourceKey(step.request.url);
    if (step.request.method === "POST" && resourceKey) {
      const namedKey = `${resourceKey}Id`.toLowerCase();
      producedByKey.set(namedKey, [
        ...(producedByKey.get(namedKey) ?? []),
        { key: `${resourceKey}Id`, stepId: step.id },
      ]);
    }
  }
  return producedByKey;
}

function applyFieldValue(
  request: PipelineGenerationStepDraft["request"],
  field: string,
  value: string,
) {
  if (field === "url") request.url = value;
  else if (field === "body") request.body = value;
  else if (field === "auth.bearer.token" && request.auth.type === "bearer" && request.auth.bearer)
    request.auth.bearer.token = value;
  else if (field.startsWith("headers.")) {
    const headerKey = field.replace("headers.", "");
    const header = request.headers.find((entry) => entry.key === headerKey);
    if (header) header.value = value;
  } else if (field.startsWith("params.")) {
    const paramKey = field.replace("params.", "");
    const param = request.params.find((entry) => entry.key === paramKey);
    if (param) param.value = value;
  }
}

function createUnresolved(
  stepId: string,
  field: string,
  variable: string,
  producedByKey: Map<string, Array<{ key: string; stepId: string }>>,
): UnresolvedVariable {
  return {
    candidates: (producedByKey.get(variable.toLowerCase()) ?? []).map((candidate) => candidate.key),
    field,
    message: `We could not resolve {{${variable}}} from this collection automatically.`,
    stepId,
    variable,
  };
}

function dependencyReason(
  steps: PipelineGenerationStepDraft[],
  fromStepId: string,
  toStepId: string,
  variable: string,
) {
  const from = steps.find((step) => step.id === fromStepId);
  const to = steps.find((step) => step.id === toStepId);
  if (isAuthRequest(from?.request ?? to!.request) || isAuthVariable(variable)) {
    return `${to?.generatedName} runs after ${from?.generatedName} because it uses the token returned there.`;
  }
  return `${to?.generatedName} runs after ${from?.generatedName} because it uses {{${variable}}}.`;
}

function toValidationExplanations(errors: PipelineGenerationDraft["validation"]["errors"]) {
  return errors.map((error) => ({
    detail: error.message,
    stepId: error.stepId,
    tone: "warning" as const,
  }));
}

function dedupe(items: string[]) {
  return Array.from(new Set(items));
}

function dedupeUnresolved(unresolved: UnresolvedVariable[]) {
  const seen = new Set<string>();
  return unresolved.filter((entry) => {
    const key = `${entry.stepId}-${entry.field}-${entry.variable}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isAuthVariable(variable: string) {
  const key = variable.toLowerCase();
  return key.includes("token") || key.includes("auth");
}
