import { collectStepDependencies } from "@/features/pipeline/template-dependencies";
import { flattenObject } from "@/features/pipeline/variable-resolver";
import { compileExecutionPlan } from "@/features/workflow/compiler/compileExecutionPlan";
import type {
  AnalyzeVariablesInput,
  LineageResolutionStatus,
  VariableAnalysisOutput,
  VariableProducer,
  VariableReference,
  VariableReferenceEdge,
} from "@/types/worker-results";
import { buildPipelineFromRegistry } from "../pipeline-adapters";
import {
  buildImpacts,
  buildRiskByStep,
  isControlCriticalField,
  PRODUCED_ROOTS,
  resolveLineageStatus,
  toRiskFlags,
} from "./lineageIndexHelpers";

export function buildLineageIndex(input: AnalyzeVariablesInput): VariableAnalysisOutput {
  const compiled = compileExecutionPlan(input);
  const workflow = compiled.expandedWorkflow ?? input.workflow;
  const registry = compiled.expandedRegistry ?? input.registry;
  const pipeline = buildPipelineFromRegistry(workflow, registry);
  const aliases = compiled.aliases;
  const aliasByRef = new Map<string, (typeof aliases)[number]>();
  const aliasIndexByStepId = new Map<string, number>();

  aliases.forEach((alias, index) => {
    aliasIndexByStepId.set(alias.stepId, index);
    alias.refs.forEach((ref) => aliasByRef.set(ref, alias));
  });

  const producers = aliases.map<VariableProducer>((alias) => ({
    stepId: alias.stepId,
    aliases: alias.refs,
    producedRoots: [...PRODUCED_ROOTS],
    availablePaths: buildAvailablePaths(input.executionContext, alias.refs),
  }));
  const producerByStepId = new Map(producers.map((producer) => [producer.stepId, producer]));

  const edges: VariableReferenceEdge[] = [];
  const references: VariableReference[] = [];
  const byVariableRef: Record<string, string[]> = {};
  const bySourceStep: Record<string, string[]> = {};
  const byDependentStep: Record<string, string[]> = {};
  const consumersSetBySourceStep = new Map<string, Set<string>>();
  const producersSetByDependentStep = new Map<string, Set<string>>();
  const byUnresolvedState: Record<LineageResolutionStatus, string[]> = {
    resolved: [],
    unresolved_alias: [],
    unresolved_path: [],
    forward_reference: [],
    runtime_only: [],
  };

  pipeline.steps.forEach((step, stepIndex) => {
    const dependencies = collectStepDependencies(step, aliases);
    dependencies.forEach((dependency, dependencyIndex) => {
      const sourceAlias = aliasByRef.get(dependency.alias);
      const resolutionStatus = resolveLineageStatus({
        currentStepIndex: stepIndex,
        sourceIndex:
          sourceAlias != null ? (aliasIndexByStepId.get(sourceAlias.stepId) ?? null) : null,
        path: dependency.path,
        producer: sourceAlias != null ? (producerByStepId.get(sourceAlias.stepId) ?? null) : null,
      });
      const edgeId = `${step.id}:${dependency.field}:${dependencyIndex}`;
      const riskFlags = toRiskFlags(resolutionStatus);
      const edge: VariableReferenceEdge = {
        id: edgeId,
        consumerStepId: step.id,
        consumerField: dependency.field,
        rawRef: dependency.rawRef,
        sourceStepId: sourceAlias?.stepId ?? null,
        sourceAlias: sourceAlias?.alias ?? null,
        referencedPath: dependency.path,
        resolutionStatus,
        riskFlags,
        controlCritical: isControlCriticalField(dependency.field),
      };

      const reference: VariableReference = {
        nodeId: step.id,
        field: dependency.field,
        rawRef: dependency.rawRef,
        alias: sourceAlias?.alias ?? null,
        path: dependency.path,
      };

      edges.push(edge);
      references.push(reference);
      byVariableRef[dependency.rawRef] ??= [];
      byVariableRef[dependency.rawRef].push(edgeId);
      byDependentStep[step.id] ??= [];
      byDependentStep[step.id].push(edgeId);
      byUnresolvedState[resolutionStatus].push(edgeId);

      if (sourceAlias?.stepId) {
        bySourceStep[sourceAlias.stepId] ??= [];
        bySourceStep[sourceAlias.stepId].push(edgeId);
        const consumers = consumersSetBySourceStep.get(sourceAlias.stepId) ?? new Set<string>();
        consumers.add(step.id);
        consumersSetBySourceStep.set(sourceAlias.stepId, consumers);

        const producers = producersSetByDependentStep.get(step.id) ?? new Set<string>();
        producers.add(sourceAlias.stepId);
        producersSetByDependentStep.set(step.id, producers);
      }
    });
  });

  const consumersBySourceStep = Object.fromEntries(
    aliases.map((alias) => [
      alias.stepId,
      Array.from(consumersSetBySourceStep.get(alias.stepId) ?? []).sort(),
    ]),
  );

  const producersByDependentStep = Object.fromEntries(
    pipeline.steps.map((step) => [
      step.id,
      Array.from(producersSetByDependentStep.get(step.id) ?? []).sort(),
    ]),
  );

  const reverseDependencies = consumersBySourceStep;
  const impacts = buildImpacts({ edges, consumersBySourceStep });
  const bySourcePath = Object.fromEntries(
    impacts.map((impact) => [`${impact.sourceStepId}:${impact.sourcePath}`, impact]),
  );
  const riskByStep = buildRiskByStep({
    stepIds: pipeline.steps.map((step) => step.id),
    edges,
  });
  const unresolved = references.filter((reference, index) => {
    const status = edges[index]?.resolutionStatus;
    return status != null && status !== "resolved";
  });

  return {
    aliases,
    references,
    unresolved,
    reverseDependencies,
    producers,
    edges,
    impacts,
    byVariableRef,
    bySourceStep,
    byDependentStep,
    byUnresolvedState,
    bySourcePath,
    consumersBySourceStep,
    producersByDependentStep,
    riskByStep,
  };
}

function buildAvailablePaths(
  executionContext: Record<string, unknown> | undefined,
  refs: string[],
) {
  const paths = new Set<string>(PRODUCED_ROOTS);
  if (!executionContext) return Array.from(paths).sort();

  const context = refs
    .map((ref) => executionContext[ref])
    .find((entry) => entry && typeof entry === "object") as Record<string, unknown> | undefined;
  if (!context || typeof context.response !== "object" || context.response == null) {
    return Array.from(paths).sort();
  }

  const response = context.response as Record<string, unknown>;
  flattenObject(response, "response", 6).forEach(({ path }) => {
    paths.add(path);
  });

  return Array.from(paths).sort();
}
