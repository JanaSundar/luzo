import type { WorkflowDefinition } from "@/types/workflow";

export interface GraphFocusInput {
  workflow: WorkflowDefinition;
  targetNodeId: string;
}

export interface GraphFocusOutput {
  ancestorIds: string[];
  descendantIds: string[];
  relatedNodeIds: string[];
}

export function computeGraphFocus(input: GraphFocusInput): GraphFocusOutput {
  const forward: Record<string, string[]> = {};
  const backward: Record<string, string[]> = {};

  for (const node of input.workflow.nodes) {
    forward[node.id] = [];
    backward[node.id] = [];
  }

  for (const edge of input.workflow.edges) {
    forward[edge.source]?.push(edge.target);
    backward[edge.target]?.push(edge.source);
  }

  const ancestorIds = walk(backward, input.targetNodeId);
  const descendantIds = walk(forward, input.targetNodeId);
  const relatedNodeIds = Array.from(
    new Set([input.targetNodeId, ...ancestorIds, ...descendantIds]),
  );

  return {
    ancestorIds: ancestorIds.sort(),
    descendantIds: descendantIds.sort(),
    relatedNodeIds: relatedNodeIds.sort(),
  };
}

function walk(adjacency: Record<string, string[]>, startNodeId: string) {
  const visited = new Set<string>();
  const queue = [...(adjacency[startNodeId] ?? [])];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId || visited.has(nodeId)) continue;
    visited.add(nodeId);
    for (const nextId of adjacency[nodeId] ?? []) {
      if (!visited.has(nextId)) queue.push(nextId);
    }
  }

  return [...visited];
}
