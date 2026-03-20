import type { PipelineStep } from "@/types";
import { extractVariableRefs, getStepAliasFromPath } from "./variable-resolver";

export interface TemplateDependency {
  field: string;
  rawRef: string;
  alias: string;
  path: string;
}

export function collectStepDependencies(step: PipelineStep): TemplateDependency[] {
  const candidates = [
    { field: "url", value: step.url },
    { field: "body", value: step.body ?? "" },
    ...step.headers.map((header) => ({
      field: `headers.${header.key}`,
      value: `${header.key}${header.value}`,
    })),
    ...step.params.map((param) => ({
      field: `params.${param.key}`,
      value: `${param.key}${param.value}`,
    })),
  ];

  return candidates.flatMap(({ field, value }) =>
    extractVariableRefs(value)
      .map((rawRef) => toDependency(field, rawRef))
      .filter((dependency): dependency is TemplateDependency => dependency !== null),
  );
}

export function collectDependenciesFromSteps(steps: PipelineStep[]): TemplateDependency[] {
  return steps.flatMap((step) => collectStepDependencies(step));
}

function toDependency(field: string, rawRef: string): TemplateDependency | null {
  const alias = getStepAliasFromPath(rawRef);
  if (!alias) return null;

  const path = rawRef.slice(alias.length + 1);
  return {
    field,
    rawRef,
    alias,
    path,
  };
}
