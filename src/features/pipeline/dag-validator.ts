"use client";

import type { PipelineStep } from "@/types";
import type { StepAlias, ValidationError, ValidationResult } from "@/types/pipeline-debug";
import { buildWorkflowBundleFromPipeline } from "@/features/workflow/pipeline-adapters";
import { validateWorkflowDag } from "@/features/workflow/validation/validateWorkflowDag";
import { collectStepDependencies } from "./template-dependencies";
import { extractVariableRefs, resolveStepAlias } from "./variable-resolver";
import { graphWorkerClient } from "@/workers/client/graph-client";
import type { Result } from "@/types/worker-results";
import type { DagValidationResult } from "@/types/worker-results";
import { buildAliasesFromSteps } from "./step-aliases";

export function buildStepAliases(steps: PipelineStep[]): StepAlias[] {
  return buildAliasesFromSteps(steps);
}

export function validatePipelineDag(steps: PipelineStep[]): ValidationResult & {
  sortedStepIds?: string[];
  adjacency?: Map<string, string[]>;
} {
  const bundle = buildWorkflowBundleFromPipeline({
    id: "pipeline",
    name: "Pipeline",
    steps,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    narrativeConfig: {
      tone: "technical",
      prompt: "",
      enabled: true,
      length: "medium",
      promptOverrides: undefined,
    },
  });

  const result = validateWorkflowDag(bundle.workflow);
  return {
    valid: result.valid,
    errors: result.errors,
    sortedStepIds: result.valid ? result.order : undefined,
    adjacency: new Map(Object.entries(result.adjacency)),
  };
}

export async function validatePipelineDagAsync(steps: PipelineStep[]): Promise<
  ValidationResult & {
    sortedStepIds?: string[];
    adjacency?: Map<string, string[]>;
  }
> {
  const bundle = buildWorkflowBundleFromPipeline({
    id: "pipeline",
    name: "Pipeline",
    steps,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    narrativeConfig: {
      tone: "technical",
      prompt: "",
      enabled: true,
      length: "medium",
      promptOverrides: undefined,
    },
  });

  const res = await graphWorkerClient.callLatest<Result<DagValidationResult>>(
    "debug-validation",
    async (api) => api.validateWorkflowDag({ workflow: bundle.workflow }),
  );

  if (!res?.ok) {
    return validatePipelineDag(steps);
  }

  const result = res.data;
  return {
    valid: result.valid,
    errors: result.errors,
    sortedStepIds: result.valid ? result.order : undefined,
    adjacency: new Map(Object.entries(result.adjacency)),
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
    for (const dep of (adjacency.get(node) || []).sort()) {
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
  availableFields: Map<string, Set<string>>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const refs = extractVariableRefs(template);
  const aliasToIndex = new Map(aliases.map((a) => [a.alias, a.index]));

  for (const ref of refs) {
    const refAlias = resolveStepAlias(ref, aliases);
    if (!refAlias) continue;

    const refIndex = aliasToIndex.get(refAlias.alias);
    if (refIndex === undefined) {
      errors.push({
        stepId: "",
        field: "",
        message: `"${refAlias.alias}" does not refer to any existing step`,
        severity: "error",
      });
      continue;
    }

    if (refIndex >= currentStepIndex) {
      errors.push({
        stepId: "",
        field: "",
        message: `"${refAlias.alias}" appears after this step (forward reference)`,
        severity: "warning",
      });
    }

    const stepFields = availableFields.get(refAlias.alias);
    const fieldPath = ref.includes(".") ? ref.substring(ref.indexOf(".") + 1) : null;
    if (stepFields && fieldPath && !stepFields.has(fieldPath)) {
      errors.push({
        stepId: "",
        field: "",
        message: `Unknown field "${fieldPath}" in ${refAlias.alias}`,
        severity: "warning",
      });
    }
  }

  return dedupeErrors(errors);
}

export function collectPipelineDependencies(steps: PipelineStep[]) {
  const aliases = buildStepAliases(steps);
  return steps.map((step) => ({
    stepId: step.id,
    dependencies: collectStepDependencies(step, aliases),
  }));
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
