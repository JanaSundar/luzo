import type { StepAlias } from "@/types/pipeline-runtime";
import type {
  CompilePlanInput,
  VariableAnalysisOutput,
  VariableReference,
} from "@/types/worker-results";
import { collectStepDependencies } from "@/features/pipeline/template-dependencies";
import { buildPipelineFromRegistry } from "../pipeline-adapters";

export function analyzeVariables(input: CompilePlanInput): VariableAnalysisOutput {
  const pipeline = buildPipelineFromRegistry(input.workflow, input.registry);
  const aliases: StepAlias[] = pipeline.steps.map((step, index) => ({
    stepId: step.id,
    alias: `req${index + 1}`,
    index,
    refs: [`req${index + 1}`, step.id],
  }));

  const references: VariableReference[] = pipeline.steps.flatMap((step) =>
    collectStepDependencies(step, aliases).map((dependency) => ({
      nodeId: step.id,
      field: dependency.field,
      rawRef: dependency.rawRef,
      alias: dependency.alias,
      path: dependency.path,
    })),
  );

  const reverseDependencies = Object.fromEntries(
    aliases.map((alias) => [alias.stepId, [] as string[]]),
  );

  for (const ref of references) {
    const target = aliases.find((alias) => alias.alias === ref.alias || alias.stepId === ref.alias);
    if (target) {
      reverseDependencies[target.stepId] ??= [];
      reverseDependencies[target.stepId].push(ref.nodeId);
    }
  }

  const unresolved = references.filter((ref) => ref.alias == null);

  return { aliases, references, unresolved, reverseDependencies };
}
