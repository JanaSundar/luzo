import type { PipelineStep } from "@/types";
import type { StepAlias } from "@/types/pipeline-debug";
import { extractVariableRefs, resolveStepAlias } from "./variable-resolver";

export interface TemplateDependency {
  field: string;
  rawRef: string;
  alias: string;
  path: string;
}

export function collectStepDependencies(
  step: PipelineStep,
  aliases: StepAlias[] = [],
): TemplateDependency[] {
  const candidates = [
    { field: "url", value: step.url },
    { field: "body", value: step.body ?? "" },
    ...(step.auth.type === "bearer" && step.auth.bearer
      ? [{ field: "auth.bearer.token", value: step.auth.bearer.token }]
      : []),
    ...(step.auth.type === "basic" && step.auth.basic
      ? [
          { field: "auth.basic.username", value: step.auth.basic.username },
          { field: "auth.basic.password", value: step.auth.basic.password },
        ]
      : []),
    ...(step.auth.type === "api-key" && step.auth.apiKey
      ? [
          { field: "auth.apiKey.key", value: step.auth.apiKey.key },
          { field: "auth.apiKey.value", value: step.auth.apiKey.value },
        ]
      : []),
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
      .map((rawRef) => toDependency(field, rawRef, aliases))
      .filter((dependency): dependency is TemplateDependency => dependency !== null),
  );
}

export function collectDependenciesFromSteps(steps: PipelineStep[]): TemplateDependency[] {
  return steps.flatMap((step) => collectStepDependencies(step));
}

function toDependency(
  field: string,
  rawRef: string,
  aliases: StepAlias[],
): TemplateDependency | null {
  const alias = resolveStepAlias(rawRef, aliases);
  if (!alias) return null;

  const path = rawRef.slice(rawRef.indexOf(".") + 1);
  return {
    field,
    rawRef,
    alias: alias.alias,
    path,
  };
}
