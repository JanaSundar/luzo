import type { PipelineStep } from "@/types";
import type { ValidationError } from "@/types/pipeline-debug";
import { buildStepAliases } from "@/features/pipeline/dag-validator";
import { resolveStepAlias } from "@/features/pipeline/variable-resolver";

export function progressiveValidate(
  template: string,
  steps: PipelineStep[],
  currentStepIndex: number,
  executionContext: Record<string, unknown> | null,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const aliases = buildStepAliases(steps);
  const aliasSet = new Set(aliases.map((alias) => alias.alias));
  const aliasToIndex = new Map(aliases.map((alias) => [alias.alias, alias.index]));

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

    const referenceIndex = aliasToIndex.get(matchedAlias.alias) ?? -1;
    if (referenceIndex >= currentStepIndex) {
      errors.push({
        stepId: "",
        field: path,
        message: `"${matchedAlias.alias}" is a forward reference (step hasn't run yet)`,
        severity: "error",
      });
      continue;
    }

    if (!executionContext) continue;
    const stepContext = executionContext[matchedAlias.alias];
    if (!stepContext) continue;

    const fieldPath = path.substring(path.indexOf(".") + 1);
    const parts = fieldPath.split(".");
    let current: unknown = stepContext;

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
