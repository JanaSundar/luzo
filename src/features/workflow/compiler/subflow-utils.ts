import type { ValidationError } from "@/types/pipeline-runtime";
import type {
  ExpandedNodeOrigin,
  SubflowDefinition,
  SubflowNodeConfig,
  WorkflowDefinition,
  WorkflowNode,
} from "@/types/workflow";

export function resolveEntryNodeIds(workflow: WorkflowDefinition, nodeIdMap: Map<string, string>) {
  const entryNodeIds =
    workflow.entryNodeIds.length > 0
      ? workflow.entryNodeIds
      : workflow.nodes
          .filter((node) => !workflow.edges.some((edge) => edge.target === node.id))
          .map((node) => node.id);
  return entryNodeIds.map((entryNodeId) => nodeIdMap.get(entryNodeId) ?? entryNodeId);
}

export function resolveTerminalNodeIds(
  workflow: WorkflowDefinition,
  nodeIdMap: Map<string, string>,
) {
  return workflow.nodes
    .filter((node) => !workflow.edges.some((edge) => edge.source === node.id))
    .map((node) => nodeIdMap.get(node.id) ?? node.id);
}

export function resolveExpandedEntryNodeIds(
  workflow: WorkflowDefinition,
  expandedNodes: WorkflowNode[],
  originsByNodeId: Record<string, ExpandedNodeOrigin>,
) {
  const originalEntry = new Set(workflow.entryNodeIds);
  return expandedNodes
    .filter((node) => {
      const origin = originsByNodeId[node.id];
      return (
        originalEntry.has(node.id) ||
        (origin?.originNodeId ? originalEntry.has(origin.originNodeId) : false)
      );
    })
    .map((node) => node.id);
}

export function isExpandedSubflowEdge(
  edge: WorkflowDefinition["edges"][number],
  nodes: WorkflowNode[],
) {
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  return source?.kind === "subflow" || target?.kind === "subflow";
}

export function toDefinitionKey(definition: SubflowDefinition) {
  return `${definition.id}:${definition.version}`;
}

export function toNodeKey(config: SubflowNodeConfig) {
  return `${config.subflowId}:${config.subflowVersion}`;
}

export function missingDefinitionWarning(stepId: string): ValidationError {
  return {
    stepId,
    field: "subflow",
    message: `Subflow node "${stepId}" is missing a pinned subflow definition`,
    severity: "error",
  };
}

export function nestedSubflowWarning(
  stepId: string,
  definition: SubflowDefinition,
): ValidationError {
  return {
    stepId,
    field: "subflow",
    message: `Subflow "${definition.name}" contains nested subflows, which are not supported yet`,
    severity: "error",
  };
}

export function invalidOutputWarning(
  stepId: string,
  definition: SubflowDefinition,
  key: string,
): ValidationError {
  return {
    stepId,
    field: "subflow.output",
    message: `Subflow "${definition.name}" output "${key}" does not resolve to an internal request`,
    severity: "error",
  };
}
