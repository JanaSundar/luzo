import type { Pipeline } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { createVariableSuggestion } from "@/utils/variableMetadata";
import { buildStepAliases } from "@/features/pipeline/dag-validator";
import { flattenObject, getByPath } from "@/features/pipeline/variable-resolver";

export function getAutocompleteSuggestions(
  pipeline: Pipeline | undefined,
  currentStepId: string,
  envVars: Record<string, string> = {},
  executionContext: Record<string, unknown> = {},
): VariableSuggestion[] {
  const suggestions: VariableSuggestion[] = [];

  Object.keys(envVars).forEach((key) => {
    suggestions.push(
      createVariableSuggestion({
        path: key,
        label: `env: ${key}`,
        resolvedValue: envVars[key],
        type: "env",
        stepId: "",
      }),
    );
  });

  if (!pipeline) return suggestions;

  const steps = pipeline.steps;
  const aliases = buildStepAliases(steps);
  const currentStepIndex = steps.findIndex((step) => step.id === currentStepId);
  if (currentStepIndex === -1) return suggestions;

  for (let index = 0; index < currentStepIndex; index += 1) {
    const alias = aliases[index];
    if (!alias) continue;

    suggestions.push(
      createVariableSuggestion({
        path: `${alias.alias}.response.status`,
        label: `${alias.alias} → Status Code`,
        resolvedValue: getByPath(executionContext, `${alias.alias}.response.status`),
        stepId: alias.stepId,
        type: "status",
      }),
    );

    const stepContext = executionContext[alias.alias] as Record<string, unknown> | undefined;
    if (!stepContext?.response || typeof stepContext.response !== "object") {
      suggestions.push(
        createVariableSuggestion({
          path: `${alias.alias}.response.headers`,
          label: `${alias.alias} → Response Headers`,
          stepId: alias.stepId,
          type: "header",
        }),
        createVariableSuggestion({
          path: `${alias.alias}.response.body`,
          label: `${alias.alias} → Response Body`,
          stepId: alias.stepId,
          type: "body",
        }),
      );
      continue;
    }

    const response = stepContext.response as Record<string, unknown>;
    if (response.headers && typeof response.headers === "object") {
      Object.keys(response.headers as Record<string, unknown>).forEach((key) => {
        suggestions.push(
          createVariableSuggestion({
            path: `${alias.alias}.response.headers.${key}`,
            label: `${alias.alias} → Header: ${key}`,
            resolvedValue: (response.headers as Record<string, unknown>)[key],
            stepId: alias.stepId,
            type: "header",
          }),
        );
      });
    }

    if (response.body === undefined) continue;

    const bodyFlat = flattenObject(response.body, `${alias.alias}.response.body`, 6);
    bodyFlat.forEach(({ path, value }) => {
      const shortLabel = path.replace(`${alias.alias}.response.body.`, "");
      suggestions.push(
        createVariableSuggestion({
          path,
          label: `${alias.alias} → body.${shortLabel}`,
          resolvedValue: value,
          stepId: alias.stepId,
          type: "body",
        }),
      );
    });
  }

  return suggestions;
}

export function filterSuggestions(
  suggestions: VariableSuggestion[],
  query: string,
): VariableSuggestion[] {
  if (!query) return suggestions;
  const normalizedQuery = query.toLowerCase();
  return suggestions.filter(
    (suggestion) =>
      suggestion.path.toLowerCase().includes(normalizedQuery) ||
      suggestion.label.toLowerCase().includes(normalizedQuery),
  );
}
