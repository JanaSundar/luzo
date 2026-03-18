import type { Pipeline, PipelineStep } from "@/types";
import type { ValidationError, VariableSuggestion } from "@/types/pipeline-debug";
import { buildStepAliases } from "./dag-validator";
import { flattenObject } from "./variable-resolver";

/**
 * Generate autocomplete suggestions for a step based on prior steps and environment.
 */
export function getAutocompleteSuggestions(
  pipeline: Pipeline | undefined,
  currentStepId: string,
  envVars: Record<string, string> = {},
  executionContext: Record<string, unknown> = {}
): VariableSuggestion[] {
  const suggestions: VariableSuggestion[] = [];

  // 1. Add Environment Variables
  Object.keys(envVars).forEach((key) => {
    suggestions.push({
      path: key,
      label: `env: ${key}`,
      type: "env",
      stepId: "",
    });
  });

  if (!pipeline) return suggestions;

  const steps = pipeline.steps;
  const aliases = buildStepAliases(steps);
  const currentStepIndex = steps.findIndex((s) => s.id === currentStepId);

  if (currentStepIndex === -1) return suggestions;

  // 2. Add variables from all prior steps
  for (let i = 0; i < currentStepIndex; i++) {
    const alias = aliases[i];
    if (!alias) continue;

    // Standard paths available for every step
    suggestions.push({
      path: `${alias.alias}.response.status`,
      label: `${alias.alias} → Status Code`,
      stepId: alias.stepId,
      type: "status",
    });

    const stepContext = executionContext[alias.alias] as Record<string, unknown> | undefined;

    // If we have actual response data, provide deeper suggestions
    if (stepContext?.response && typeof stepContext.response === "object") {
      const resp = stepContext.response as Record<string, unknown>;

      if (resp.headers && typeof resp.headers === "object") {
        Object.keys(resp.headers as Record<string, unknown>).forEach((key) => {
          suggestions.push({
            path: `${alias.alias}.response.headers.${key}`,
            label: `${alias.alias} → Header: ${key}`,
            stepId: alias.stepId,
            type: "header",
          });
        });
      }

      if (resp.body !== undefined) {
        const bodyFlat = flattenObject(resp.body, `${alias.alias}.response.body`, 4);
        bodyFlat.forEach(({ path }) => {
          const shortLabel = path.replace(`${alias.alias}.response.body.`, "");
          suggestions.push({
            path,
            label: `${alias.alias} → body.${shortLabel}`,
            stepId: alias.stepId,
            type: "body",
          });
        });
      }
    } else {
      // Fallback: provide basic placeholders if no execution data
      suggestions.push({
        path: `${alias.alias}.response.body`,
        label: `${alias.alias} → Response Body`,
        stepId: alias.stepId,
        type: "body",
      });
    }
  }

  return suggestions;
}

/**
 * Progressive validation stages:
 * 1. Before execution: only validate that referenced steps exist and are backward refs
 * 2. After execution: validate field paths against actual data
 */
export function progressiveValidate(
  template: string,
  steps: PipelineStep[],
  currentStepIndex: number,
  executionContext: Record<string, unknown> | null
): ValidationError[] {
  const errors: ValidationError[] = [];
  const aliases = buildStepAliases(steps);
  const aliasSet = new Set(aliases.map((a) => a.alias));
  const aliasToIndex = new Map(aliases.map((a) => [a.alias, a.index]));

  const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;
  const matches = [...template.matchAll(VARIABLE_REGEX)];

  for (const match of matches) {
    const path = match[1].trim();
    const dotIndex = path.indexOf(".");
    if (dotIndex === -1) continue;

    const refAlias = path.substring(0, dotIndex);
    if (!/^req\d+$/.test(refAlias)) continue;

    if (!aliasSet.has(refAlias)) {
      errors.push({
        stepId: "",
        field: path,
        message: `"${refAlias}" does not refer to any pipeline step`,
        severity: "error",
      });
      continue;
    }

    const refIndex = aliasToIndex.get(refAlias) ?? -1;
    if (refIndex >= currentStepIndex) {
      errors.push({
        stepId: "",
        field: path,
        message: `"${refAlias}" is a forward reference (step hasn't run yet)`,
        severity: "error",
      });
      continue;
    }

    // After execution: validate field exists
    if (executionContext) {
      const stepCtx = executionContext[refAlias];
      if (stepCtx) {
        const fieldPath = path.substring(refAlias.length + 1);
        const parts = fieldPath.split(".");
        let current: unknown = stepCtx;

        for (const part of parts) {
          if (current == null || typeof current !== "object") {
            errors.push({
              stepId: "",
              field: path,
              message: `Unknown field "${fieldPath}" in ${refAlias}`,
              severity: "warning",
            });
            break;
          }
          current = (current as Record<string, unknown>)[part];
        }
      }
    }
  }

  return errors;
}

/**
 * Filter suggestions based on partial input text.
 */
export function filterSuggestions(
  suggestions: VariableSuggestion[],
  query: string
): VariableSuggestion[] {
  if (!query) return suggestions;
  const q = query.toLowerCase();
  return suggestions.filter(
    (s) => s.path.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)
  );
}
