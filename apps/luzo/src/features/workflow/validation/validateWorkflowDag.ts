import type { ValidationError } from "@/types/pipeline-runtime";
import type { DagValidationResult } from "@/types/worker-results";
import type { WorkflowDefinition, WorkflowNodeKind } from "@/types/workflow";
import { buildAdjacency } from "./buildAdjacency";
import { deriveStages } from "./deriveStages";
import { findUnreachableNodes } from "./findUnreachableNodes";

const KIND_WEIGHT: Record<WorkflowNodeKind, number> = {
  start: 0,
  request: 1,
  condition: 2,
  transform: 3,
  delay: 4,
  poll: 5,
  subflow: 6,
  end: 7,
};

export function validateWorkflowDag(workflow: WorkflowDefinition): DagValidationResult {
  const nodeMap = new Map(workflow.nodes.map((node, index) => [node.id, { node, index }]));
  const errors: ValidationError[] = [];
  const { adjacency, reverseAdjacency } = buildAdjacency(workflow);
  const inDegree = new Map<string, number>(workflow.nodes.map((node) => [node.id, 0]));

  for (const edge of workflow.edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) {
      errors.push({
        stepId: edge.source,
        field: "edge",
        message: `Edge "${edge.id}" references a missing node`,
        severity: "error",
      });
      continue;
    }
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const ready = workflow.nodes
    .filter((node) => (inDegree.get(node.id) ?? 0) === 0)
    .sort((a, b) => compareNodes(a.id, b.id, nodeMap));
  const order: string[] = [];

  while (ready.length > 0) {
    const current = ready.shift();
    if (!current) continue;
    order.push(current.id);

    for (const nextId of reverseAdjacency[current.id] ?? []) {
      const nextDegree = (inDegree.get(nextId) ?? 0) - 1;
      inDegree.set(nextId, nextDegree);
      if (nextDegree === 0) {
        const next = nodeMap.get(nextId)?.node;
        if (next) {
          ready.push(next);
          ready.sort((a, b) => compareNodes(a.id, b.id, nodeMap));
        }
      }
    }
  }

  if (order.length !== workflow.nodes.length) {
    errors.push({
      stepId: "",
      field: "dag",
      message: "Cycle detected in workflow graph",
      severity: "error",
    });
  }

  const unreachableNodeIds = findUnreachableNodes(workflow, reverseAdjacency);
  for (const nodeId of unreachableNodeIds) {
    errors.push({
      stepId: nodeId,
      field: "dag",
      message: `Node "${nodeId}" is unreachable from any entry node`,
      severity: "warning",
    });
  }

  return {
    valid: !errors.some((error) => error.severity === "error"),
    errors,
    order,
    stages: deriveStages(order, adjacency),
    adjacency,
    reverseAdjacency,
    unreachableNodeIds,
  };
}

function compareNodes(
  nodeIdA: string,
  nodeIdB: string,
  nodeMap: Map<string, { node: { id: string; kind: WorkflowNodeKind }; index: number }>,
) {
  const nodeA = nodeMap.get(nodeIdA);
  const nodeB = nodeMap.get(nodeIdB);
  const kindDiff =
    KIND_WEIGHT[nodeA?.node.kind ?? "request"] - KIND_WEIGHT[nodeB?.node.kind ?? "request"];
  if (kindDiff !== 0) return kindDiff;
  const indexDiff = (nodeA?.index ?? 0) - (nodeB?.index ?? 0);
  if (indexDiff !== 0) return indexDiff;
  return nodeIdA.localeCompare(nodeIdB);
}
