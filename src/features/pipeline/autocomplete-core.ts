import type { Pipeline, PipelineStep } from "@/types";
import type { ValidationError, VariableSuggestion } from "@/types/pipeline-debug";
import { createVariableSuggestion } from "@/utils/variableMetadata";
import { buildStepAliases } from "./dag-validator";
import { flattenObject, getByPath, resolveStepAlias } from "./variable-resolver";

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
  const currentStepIndex = steps.findIndex((s) => s.id === currentStepId);

  if (currentStepIndex === -1) return suggestions;

  for (let i = 0; i < currentStepIndex; i++) {
    const alias = aliases[i];
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

    if (stepContext?.response && typeof stepContext.response === "object") {
      const resp = stepContext.response as Record<string, unknown>;

      if (resp.headers && typeof resp.headers === "object") {
        Object.keys(resp.headers as Record<string, unknown>).forEach((key) => {
          suggestions.push(
            createVariableSuggestion({
              path: `${alias.alias}.response.headers.${key}`,
              label: `${alias.alias} → Header: ${key}`,
              resolvedValue: (resp.headers as Record<string, unknown>)[key],
              stepId: alias.stepId,
              type: "header",
            }),
          );
        });
      }

      if (resp.body !== undefined) {
        const bodyFlat = flattenObject(resp.body, `${alias.alias}.response.body`, 6);
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
    } else {
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
    }
  }

  return suggestions;
}

export function progressiveValidate(
  template: string,
  steps: PipelineStep[],
  currentStepIndex: number,
  executionContext: Record<string, unknown> | null,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const aliases = buildStepAliases(steps);
  const aliasSet = new Set(aliases.map((a) => a.alias));
  const aliasToIndex = new Map(aliases.map((a) => [a.alias, a.index]));

  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches = [...template.matchAll(variableRegex)];

  for (const match of matches) {
    const path = match[1].trim();
    if (path.indexOf(".") === -1) continue;

    const matchedAlias = resolveStepAlias(path, aliases);
    if (!matchedAlias) continue;

    if (!aliasSet.has(matchedAlias.alias)) {
      errors.push({
        stepId: "",
        field: path,
        message: `"${matchedAlias.alias}" does not refer to any pipeline step`,
        severity: "error",
      });
      continue;
    }

    const refIndex = aliasToIndex.get(matchedAlias.alias) ?? -1;
    if (refIndex >= currentStepIndex) {
      errors.push({
        stepId: "",
        field: path,
        message: `"${matchedAlias.alias}" is a forward reference (step hasn't run yet)`,
        severity: "error",
      });
      continue;
    }

    if (!executionContext) continue;

    const stepCtx = executionContext[matchedAlias.alias];
    if (!stepCtx) continue;

    const fieldPath = path.substring(path.indexOf(".") + 1);
    const parts = fieldPath.split(".");
    let current: unknown = stepCtx;

    for (const part of parts) {
      if (current == null || typeof current !== "object") {
        errors.push({
          stepId: "",
          field: path,
          message: `Unknown field "${fieldPath}" in ${matchedAlias.alias}`,
          severity: "warning",
        });
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }
  }

  return errors;
}

export function filterSuggestions(
  suggestions: VariableSuggestion[],
  query: string,
): VariableSuggestion[] {
  if (!query) return suggestions;
  const q = query.toLowerCase();
  return suggestions.filter(
    (s) => s.path.toLowerCase().includes(q) || s.label.toLowerCase().includes(q),
  );
}
