import type { Pipeline, TemplateDefinition } from "@/types";
import { ensurePipelineFlowDocument } from "@/features/pipeline/canvas-flow";
import { createTemplateGenerationSource } from "@/features/workflow-starter/source-metadata";
import { interpolateVariables } from "@/utils/variables";

export function instantiateTemplate(
  template: TemplateDefinition,
  values: Record<string, string>,
): Pipeline {
  const cloned = JSON.parse(JSON.stringify(template.pipelineDefinition)) as Pipeline;
  const interpolated = interpolateObject(cloned, values) as Pipeline;
  const pipelineId = crypto.randomUUID();
  const stepIdMap = new Map(interpolated.steps.map((step) => [step.id, crypto.randomUUID()]));
  const nextSteps = interpolated.steps.map((step) => ({
    ...step,
    id: stepIdMap.get(step.id) ?? step.id,
  }));
  const nextPipeline = {
    ...interpolated,
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      source: createTemplateGenerationSource(template),
      stepMappings: nextSteps.map((step, index) => ({
        grouping: "sequential" as const,
        sourceRequestId: step.id,
        stageIndex: index + 1,
        stepId: step.id,
      })),
      summary: {
        dependencyCount: 0,
        unresolvedCount: 0,
        warningCount: 0,
      },
    },
    id: pipelineId,
    name: interpolated.name,
    steps: nextSteps,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const flowDocument = interpolated.flowDocument
    ? {
        ...interpolated.flowDocument,
        id: pipelineId,
        name: interpolated.name,
        nodes: interpolated.flowDocument.nodes.map((node) => {
          if (node.kind === "start") {
            return { ...node, id: `${pipelineId}:start` };
          }
          if (node.kind === "request") {
            const nextId =
              stepIdMap.get(node.requestRef ?? node.dataRef ?? node.id) ??
              stepIdMap.get(node.id) ??
              node.id;
            return {
              ...node,
              id: nextId,
              dataRef: nextId,
              requestRef: nextId,
            };
          }
          return { ...node };
        }),
      }
    : undefined;
  const nodeIdMap = new Map(
    (interpolated.flowDocument?.nodes ?? []).map((node, index) => [
      node.id,
      flowDocument?.nodes[index]?.id ?? node.id,
    ]),
  );
  return {
    ...nextPipeline,
    flowDocument: ensurePipelineFlowDocument({
      ...nextPipeline,
      flowDocument: flowDocument
        ? {
            ...flowDocument,
            edges: flowDocument.edges.map((edge) => ({
              ...edge,
              id: crypto.randomUUID(),
              source: nodeIdMap.get(edge.source) ?? edge.source,
              target: nodeIdMap.get(edge.target) ?? edge.target,
            })),
          }
        : undefined,
    }),
  };
}

function interpolateObject(value: unknown, values: Record<string, string>): unknown {
  if (typeof value === "string") {
    return interpolateVariables(value, values);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => interpolateObject(entry, values));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, interpolateObject(entry, values)]),
    );
  }
  return value;
}
