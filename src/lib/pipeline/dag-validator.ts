import type { PipelineStep } from "@/types";
import type { StepAlias, ValidationError, ValidationResult } from "@/types/pipeline-debug";
import { collectStepDependencies } from "./template-dependencies";
import { extractVariableRefs, getStepAliasFromPath } from "./variable-resolver";

export function buildStepAliases(steps: PipelineStep[]): StepAlias[] {
  return steps.map((step, index) => ({
    stepId: step.id,
    alias: `req${index + 1}`,
    index,
  }));
}

export function validatePipelineDag(steps: PipelineStep[]): ValidationResult & {
  sortedStepIds?: string[];
  adjacency?: Map<string, string[]>;
} {
  const errors: ValidationError[] = [];

  const aliases = buildStepAliases(steps);
  const aliasToStepId = new Map(aliases.map((a) => [a.alias, a.stepId]));

  const adjacency = new Map<string, string[]>();

  /* Build adjacency */
  for (const step of steps) {
    const deps = collectStepDependencies(step);
    const uniqueDeps = new Set<string>();

    for (const dep of deps) {
      const depStepId = aliasToStepId.get(dep.alias);

      if (!depStepId) {
        errors.push({
          stepId: step.id,
          field: dep.field,
          message: `Reference "{{${dep.rawRef}}}" points to missing step "${dep.alias}"`,
          severity: "error",
        });
        continue;
      }

      if (depStepId === step.id) {
        errors.push({
          stepId: step.id,
          field: dep.field,
          message: `Step cannot reference itself ("${dep.alias}")`,
          severity: "error",
        });
        continue;
      }

      uniqueDeps.add(depStepId);
    }

    adjacency.set(step.id, Array.from(uniqueDeps));
  }

  /* DFS for cycle detection + topo sort */
  const visited = new Set<string>();
  const inPath = new Set<string>();
  const sorted: string[] = [];

  function dfs(node: string, path: string[]): boolean {
    if (inPath.has(node)) {
      errors.push({
        stepId: node,
        field: "dag",
        message: `Cycle detected: ${[...path, node].join(" → ")}`,
        severity: "error",
      });
      return true;
    }

    if (visited.has(node)) return false;

    visited.add(node);
    inPath.add(node);
    path.push(node);

    const deps = (adjacency.get(node) || []).sort();

    for (const dep of deps) {
      if (dfs(dep, path)) return true;
    }

    path.pop();
    inPath.delete(node);
    sorted.push(node);

    return false;
  }

  for (const step of steps) {
    if (!visited.has(step.id)) {
      if (dfs(step.id, [])) break;
    }
  }

  const finalErrors = dedupeErrors(errors);
  const hasErrors = finalErrors.some((e) => e.severity === "error");

  return {
    valid: !hasErrors,
    errors: finalErrors,
    sortedStepIds: hasErrors ? undefined : sorted,
    adjacency,
  };
}

export function getExecutionPath(targetStepId: string, adjacency: Map<string, string[]>): string[] {
  const visited = new Set<string>();
  const inPath = new Set<string>();
  const executionOrder: string[] = [];

  function dfs(node: string) {
    if (inPath.has(node)) {
      throw new Error(`Cycle detected while computing execution path at "${node}"`);
    }

    if (visited.has(node)) return;

    if (!adjacency.has(node)) {
      throw new Error(`Step "${node}" not found in DAG`);
    }

    visited.add(node);
    inPath.add(node);

    const deps = (adjacency.get(node) || []).sort();

    for (const dep of deps) {
      dfs(dep);
    }

    inPath.delete(node);
    executionOrder.push(node);
  }

  dfs(targetStepId);

  return executionOrder;
}

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
    if (!refAlias) continue;

    const refIndex = aliasToIndex.get(refAlias);

    if (refIndex === undefined) {
      errors.push({
        stepId: "",
        field: "",
        message: `"${refAlias}" does not refer to any existing step`,
        severity: "error",
      });
      continue;
    }

    if (refIndex >= currentStepIndex) {
      errors.push({
        stepId: "",
        field: "",
        message: `"${refAlias}" appears after this step (forward reference)`,
        severity: "warning",
      });
    }

    const stepFields = availableFields.get(refAlias);

    if (stepFields) {
      const fieldPath = ref.includes(".") ? ref.substring(refAlias.length + 1) : null;

      if (fieldPath && !stepFields.has(fieldPath)) {
        errors.push({
          stepId: "",
          field: "",
          message: `Unknown field "${fieldPath}" in ${refAlias}`,
          severity: "warning",
        });
      }
    }
  }

  return dedupeErrors(errors);
}

function dedupeErrors(errors: ValidationError[]): ValidationError[] {
  const seen = new Set<string>();

  return errors.filter((e) => {
    const key = `${e.stepId}-${e.field}-${e.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
