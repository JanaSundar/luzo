import type { Pipeline, PipelineStep } from "@/types";
import type { ValidationError, VariableSuggestion } from "@/types/pipeline-debug";
import { createVariableSuggestion } from "@/lib/utils/variableMetadata";
import { buildStepAliases } from "./dag-validator";
import { buildStepSuggestions } from "./autocomplete-step-suggestions";
import { buildFlowGraphIndex, hasBit } from "./timeline/flow-graph";
import { resolveStepAlias } from "./variable-resolver";

/**
 * Generate autocomplete suggestions for a step based on prior steps and environment.
 */
export function getAutocompleteSuggestions(
  pipeline: Pipeline | undefined,
  currentStepId: string,
  envVars: Record<string, string> = {},
  executionContext: Record<string, unknown> = {},
): VariableSuggestion[] {
  const suggestions: VariableSuggestion[] = buildEnvironmentSuggestions(envVars);
  if (!pipeline) return suggestions;

  const steps = pipeline.steps;
  const currentStepIndex = steps.findIndex((s) => s.id === currentStepId);
  if (currentStepIndex === -1) return suggestions;

  return [
    ...suggestions,
    ...buildStepSuggestions({
      allSteps: steps,
      candidateStepIds: new Set(steps.slice(0, currentStepIndex).map((step) => step.id)),
      executionContext,
    }),
  ];
}

export function getFlowNodeAutocompleteSuggestions(
  pipeline: Pipeline | undefined,
  currentNodeId: string,
  envVars: Record<string, string> = {},
  executionContext: Record<string, unknown> = {},
) {
  const suggestions = buildEnvironmentSuggestions(envVars);
  if (!pipeline) return suggestions;

  const currentStepId = pipeline.steps.find((step) => step.id === currentNodeId)?.id;
  if (currentStepId)
    return getAutocompleteSuggestions(pipeline, currentStepId, envVars, executionContext);

  const graph = buildFlowGraphIndex(pipeline.flow);
  if (!graph) return suggestions;

  const ancestorBits = graph.ancestorBitsetByNode.get(currentNodeId);
  const fallbackAncestorBits = ancestorBits ?? createEmptyAncestors(graph.nodeIdByIndex.length);
  const priorSteps = pipeline.steps.filter((step) =>
    hasBit(fallbackAncestorBits, graph.nodeIndexById.get(step.id)),
  );

  return [
    ...suggestions,
    ...buildStepSuggestions({
      allSteps: pipeline.steps,
      candidateStepIds: new Set(priorSteps.map((step) => step.id)),
      executionContext,
    }),
  ];
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
  executionContext: Record<string, unknown> | null,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const aliases = buildStepAliases(steps);
  const aliasSet = new Set(aliases.map((a) => a.alias));
  const aliasToIndex = new Map(aliases.map((a) => [a.alias, a.index]));

  const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;
  const matches = [...template.matchAll(VARIABLE_REGEX)];

  for (const match of matches) {
    const rawPath = match[1];
    if (!rawPath) continue;
    const path = rawPath.trim();
    const dotIndex = path.indexOf(".");
    if (dotIndex === -1) continue;

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

    // After execution: validate field exists
    if (executionContext) {
      const stepCtx = executionContext[matchedAlias.alias];
      if (stepCtx) {
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
    }
  }

  return errors;
}

/**
 * Filter suggestions based on partial input text.
 */
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

function buildEnvironmentSuggestions(envVars: Record<string, string>) {
  return Object.entries(envVars).map(([key, resolvedValue]) =>
    createVariableSuggestion({
      path: key,
      label: `env: ${key}`,
      resolvedValue,
      type: "env",
      stepId: "",
    }),
  );
}

function createEmptyAncestors(size: number) {
  return new Uint32Array(Math.max(1, Math.ceil(size / 32)));
}
