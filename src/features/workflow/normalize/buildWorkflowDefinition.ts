import type { BuildWorkflowInput } from "@/types/worker-results";
import type { WorkflowBundle, WorkflowDefinition } from "@/types/workflow";
import { normalizeFlowDocument } from "./normalizeFlowDocument";

export function buildWorkflowDefinition(input: BuildWorkflowInput): WorkflowBundle {
  const flow = normalizeFlowDocument(input.flow);

  const workflow: WorkflowDefinition = {
    kind: "workflow-definition",
    version: 1,
    id: flow.id,
    name: flow.name,
    createdAt: flow.createdAt,
    updatedAt: flow.updatedAt,
    entryNodeIds: flow.nodes.filter((node) => node.kind === "start").map((node) => node.id),
    requestRegistryId: input.registryId,
    nodes: flow.nodes.map((node) => ({
      id: node.id,
      kind: node.kind,
      configRef: node.dataRef,
      requestRef:
        node.kind === "request" ? (node.requestRef ?? node.dataRef ?? node.id) : undefined,
      config: node.config,
    })),
    edges: flow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      semantics: edge.semantics,
    })),
  };

  return {
    flow,
    workflow,
    registry: {
      kind: "request-registry",
      version: 1,
      id: input.registryId,
      requests: {},
    },
  };
}
