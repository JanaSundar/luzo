import type { PipelineStep } from "@/types";
import type { StepAlias, ValidationError, ValidationResult } from "@/types/pipeline-debug";
import { collectStepDependencies } from "./template-dependencies";
import { extractVariableRefs, getStepAliasFromPath } from "./variable-resolver";

/**
 * Build a map of stepId → alias (req1, req2, ...) based on step order.
 */
export function buildStepAliases(steps: PipelineStep[]): StepAlias[] {
  return steps.map((step, index) => ({
    stepId: step.id,
    alias: `req${index + 1}`,
    index,
  }));
}

/**
 * Validate that all pipeline steps have correct backward-only references.
 */
export function validatePipelineDag(steps: PipelineStep[]): ValidationResult {
  const errors: ValidationError[] = [];
  const aliases = buildStepAliases(steps);
  const aliasSet = new Set(aliases.map((a) => a.alias));
  const aliasToIndex = new Map(aliases.map((a) => [a.alias, a.index]));

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const currentAlias = aliases[i].alias;
    const dependencies = collectStepDependencies(step);

    for (const dependency of dependencies) {
      if (!aliasSet.has(dependency.alias)) {
        errors.push({
          stepId: step.id,
          field: dependency.field,
          message: `Reference "{{${dependency.rawRef}}}" points to "${dependency.alias}" which does not exist. Available: ${[...aliasSet].join(", ")}`,
          severity: "error",
        });
        continue;
      }

      const refIndex = aliasToIndex.get(dependency.alias) ?? -1;
      if (refIndex >= i) {
        errors.push({
          stepId: step.id,
          field: dependency.field,
          message: `Step "${currentAlias}" references "${dependency.alias}" which hasn't executed yet. Only backward references are allowed.`,
          severity: "error",
        });
      }
    }
  }

  return {
    valid: errors.filter((e) => e.severity === "error").length === 0,
    errors,
  };
}

/**
 * Quick check for a single template string — returns warnings for unknown fields.
 * Used for progressive validation during typing.
 */
export function validateVariableRefsInTemplate(
  template: string,
  aliases: StepAlias[],
  currentStepIndex: number,
  availableFields: Map<string, Set<string>>
): ValidationError[] {
  const errors: ValidationError[] = [];
  const refs = extractVariableRefs(template);
  const aliasToIndex = new Map(aliases.map((a) => [a.alias, a.index]));

  for (const ref of refs) {
    const refAlias = getStepAliasFromPath(ref);
    if (refAlias === null) continue;

    if (!aliasToIndex.has(refAlias)) {
      errors.push({
        stepId: "",
        field: "",
        message: `"${refAlias}" does not refer to any step`,
        severity: "error",
      });
      continue;
    }

    const refIndex = aliasToIndex.get(refAlias) ?? -1;
    if (refIndex >= currentStepIndex) {
      errors.push({
        stepId: "",
        field: "",
        message: `"${refAlias}" hasn't executed yet (forward reference)`,
        severity: "error",
      });
      continue;
    }

    const stepFields = availableFields.get(refAlias);
    if (stepFields) {
      const fieldPath = ref.substring(refAlias.length + 1);
      if (!stepFields.has(fieldPath)) {
        errors.push({
          stepId: "",
          field: "",
          message: `Unknown field "${fieldPath}" in ${refAlias}`,
          severity: "warning",
        });
      }
    }
  }

  return errors;
}
