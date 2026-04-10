import { DEFAULT_PROMPTS } from "@/features/pipeline/ai-constants";
import { ensurePipelineFlowDocument } from "@/features/pipeline/canvas-flow";
import type { Pipeline, PipelineStep } from "@/types";
import type { CompilePlanInput, CompilePlanOutput } from "@/types/worker-results";
import type { RequestRegistry, WorkflowBundle, WorkflowDefinition } from "@/types/workflow";

export function buildWorkflowBundleFromPipeline(pipeline: Pipeline): WorkflowBundle {
  const flow = ensurePipelineFlowDocument(pipeline);
  const registry: RequestRegistry = {
    kind: "request-registry",
    version: 1,
    id: `${pipeline.id}:registry`,
    createdAt: pipeline.createdAt,
    updatedAt: pipeline.updatedAt,
    requests: Object.fromEntries(
      pipeline.steps.map((step) => [
        step.id,
        {
          ...step,
          id: step.id,
          name: step.name,
        },
      ]),
    ),
  };

  const executableNodes = flow.nodes.filter((node) => node.kind !== "start");
  const requestNodes = executableNodes.filter((node) => node.kind === "request");
  const executableNodeIds = new Set(executableNodes.map((node) => node.id));
  const nodeIdByRequestRef = new Map(
    requestNodes.map((node) => [node.requestRef ?? node.dataRef ?? node.id, node.id]),
  );

  const requestEdges = flow.edges
    .map((edge) => {
      const sourceId = executableNodeIds.has(edge.source)
        ? edge.source
        : nodeIdByRequestRef.get(edge.source);
      const targetId = executableNodeIds.has(edge.target)
        ? edge.target
        : nodeIdByRequestRef.get(edge.target);

      if (sourceId && targetId) {
        return { ...edge, source: sourceId, target: targetId };
      }
      return null;
    })
    .filter((edge): edge is NonNullable<typeof edge> => edge !== null);
  const requestNodesWithExplicitRoutes = new Set(
    requestEdges
      .filter((edge) => edge.semantics === "success" || edge.semantics === "failure")
      .map((edge) => edge.source),
  );
  const requestNodeIds = new Set(requestNodes.map((node) => node.id));
  const conditionNodeIds = new Set(
    executableNodes.filter((node) => node.kind === "condition").map((node) => node.id),
  );
  const normalizedRequestEdges = requestEdges.filter(
    (edge) => !(edge.semantics === "control" && requestNodesWithExplicitRoutes.has(edge.source)),
  );
  const requestNodesRoutedThroughCondition = new Set(
    normalizedRequestEdges
      .filter(
        (edge) =>
          requestNodeIds.has(edge.source) &&
          conditionNodeIds.has(edge.target) &&
          edge.semantics === "control",
      )
      .map((edge) => edge.source),
  );
  const executionEdges = normalizedRequestEdges.filter((edge) => {
    if (!requestNodesRoutedThroughCondition.has(edge.source)) return true;
    return conditionNodeIds.has(edge.target);
  });
  const incomingRequestEdges = new Map<string, number>();
  for (const edge of executionEdges) {
    incomingRequestEdges.set(edge.target, (incomingRequestEdges.get(edge.target) ?? 0) + 1);
  }

  const workflow: WorkflowDefinition = {
    kind: "workflow-definition",
    version: 1,
    id: pipeline.id,
    name: pipeline.name,
    createdAt: pipeline.createdAt,
    updatedAt: pipeline.updatedAt,
    requestRegistryId: registry.id,
    entryNodeIds: executableNodes
      .filter((node) => (incomingRequestEdges.get(node.id) ?? 0) === 0)
      .map((node) => node.id),
    nodes: executableNodes.map((node) => ({
      id: node.id,
      kind: node.kind,
      requestRef:
        node.kind === "request" ? (node.requestRef ?? node.dataRef ?? node.id) : undefined,
      configRef: node.requestRef ?? node.dataRef ?? node.id,
      config: node.config,
      source:
        node.kind === "request"
          ? pipeline.steps.find((step) => step.id === (node.requestRef ?? node.dataRef ?? node.id))
              ?.requestSource
          : undefined,
    })),
    edges: executionEdges.map((edge) => ({ ...edge })),
  };

  return { flow, workflow, registry };
}

export function toCompilePlanInput(pipeline: Pipeline): CompilePlanInput {
  const bundle = buildWorkflowBundleFromPipeline(pipeline);
  return { workflow: bundle.workflow, registry: bundle.registry };
}

export function buildPipelineFromRegistry(
  workflow: WorkflowDefinition,
  registry: RequestRegistry,
): Pipeline {
  const steps: PipelineStep[] = workflow.nodes
    .filter((node) => node.kind === "request")
    .map((node) => registry.requests[node.requestRef ?? ""])
    .filter((request): request is PipelineStep => Boolean(request));

  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.name,
    steps,
    narrativeConfig: {
      tone: "technical",
      prompt: DEFAULT_PROMPTS.technical,
      enabled: true,
      length: "medium",
      promptOverrides: DEFAULT_PROMPTS,
    },
    createdAt: workflow.createdAt ?? new Date().toISOString(),
    updatedAt: workflow.updatedAt ?? new Date().toISOString(),
  };
}

export function buildExecutionPipelineFromCompileOutput(
  sourcePipeline: Pipeline,
  compiled: CompilePlanOutput,
): Pipeline {
  const expandedRegistry = compiled.expandedRegistry;
  if (!expandedRegistry) {
    return sourcePipeline;
  }
  const steps = compiled.plan.order
    .map((nodeId) => compiled.plan.nodes.find((node) => node.nodeId === nodeId))
    .filter((node): node is NonNullable<typeof node> => Boolean(node))
    .filter((node) => node.kind === "request" && Boolean(node.requestRef))
    .flatMap((node) => {
      const request = expandedRegistry.requests[node.requestRef ?? ""];
      if (!request) return [];
      return [
        {
          ...request,
          id: node.nodeId,
          name: request.name ?? node.nodeId,
          requestSource: { mode: "detached" as const },
        } satisfies PipelineStep,
      ];
    });

  return {
    ...sourcePipeline,
    steps,
  };
}
