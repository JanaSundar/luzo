import type { PipelineStep } from "@/types";
import type { ValidationError } from "@/types/pipeline-debug";
import { buildStepAliases } from "@/features/pipeline/dag-validator";
import { getByPath, resolveStepAlias } from "@/features/pipeline/variable-resolver";
import { VARIABLE_REGEX } from "@/utils/variables";

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

  const matches = [...template.matchAll(VARIABLE_REGEX)];

  for (const match of matches) {
    const path = match[1]?.trim();
    if (!path) continue;
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
    if (getByPath(stepContext, fieldPath) === undefined) {
      errors.push({
        stepId: "",
        field: path,
        message: `Unknown field "${fieldPath}" in ${matchedAlias.alias}`,
        severity: "warning",
      });
    }
  }

  return errors;
}
