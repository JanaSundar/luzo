import type { PipelineStep } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { createVariableSuggestion } from "@/lib/utils/variableMetadata";
import { buildStepAliases } from "./dag-validator";
import { flattenObject, getByPath } from "./variable-resolver";

export function buildStepSuggestions(params: {
  allSteps: PipelineStep[];
  candidateStepIds: Set<string>;
  executionContext: Record<string, unknown>;
}): VariableSuggestion[] {
  const aliases = buildStepAliases(params.allSteps);
  const suggestions: VariableSuggestion[] = [];

  params.allSteps.forEach((step, index) => {
    if (!params.candidateStepIds.has(step.id)) return;
    const alias = aliases[index];
    if (!alias) return;

    const source = buildSuggestionSource(step, alias.alias);
    suggestions.push(
      createVariableSuggestion({
        path: `${alias.alias}.response.status`,
        label: `${step.name} → Status code`,
        resolvedValue: getByPath(params.executionContext, `${alias.alias}.response.status`),
        stepId: alias.stepId,
        type: "status",
        ...source,
      }),
    );

    if (step.stepType === "ai") {
      suggestions.push(
        createVariableSuggestion({
          path: `${alias.alias}.response.outputText`,
          label: `${step.name} → Output text`,
          resolvedValue: getByPath(params.executionContext, `${alias.alias}.response.outputText`),
          stepId: alias.stepId,
          type: "body",
          ...source,
        }),
      );
    }

    const stepContext = params.executionContext[alias.alias] as Record<string, unknown> | undefined;
    if (stepContext?.response && typeof stepContext.response === "object") {
      const resp = stepContext.response as Record<string, unknown>;
      Object.keys((resp.headers as Record<string, unknown>) ?? {}).forEach((key) => {
        suggestions.push(
          createVariableSuggestion({
            path: `${alias.alias}.response.headers.${key}`,
            label: `${step.name} → Header: ${key}`,
            resolvedValue: (resp.headers as Record<string, unknown>)[key],
            stepId: alias.stepId,
            type: "header",
            ...source,
          }),
        );
      });

      if (resp.body !== undefined) {
        flattenObject(resp.body, `${alias.alias}.response.body`, 6).forEach(({ path, value }) => {
          const shortLabel = path.replace(`${alias.alias}.response.body.`, "");
          suggestions.push(
            createVariableSuggestion({
              path,
              label: `${step.name} → body.${shortLabel}`,
              resolvedValue: value,
              stepId: alias.stepId,
              type: "body",
              ...source,
            }),
          );
        });
      }
      return;
    }

    suggestions.push(
      createVariableSuggestion({
        path: `${alias.alias}.response.headers`,
        label: `${step.name} → Response headers`,
        stepId: alias.stepId,
        type: "header",
        ...source,
      }),
      createVariableSuggestion({
        path: `${alias.alias}.response.body`,
        label: `${step.name} → Response body`,
        stepId: alias.stepId,
        type: "body",
        ...source,
      }),
    );
  });

  return suggestions;
}

function buildSuggestionSource(step: PipelineStep, alias: string) {
  return {
    sourceAlias: alias,
    sourceLabel: step.name,
    sourceMethod: step.method,
    sourceUrl: step.url,
  };
}
