import type { WorkflowDefinition } from "@/types/workflow";

export interface GraphAdjacency {
  adjacency: Record<string, string[]>;
  reverseAdjacency: Record<string, string[]>;
}

export function buildAdjacency(workflow: WorkflowDefinition): GraphAdjacency {
  const adjacency: Record<string, string[]> = {};
  const reverseAdjacency: Record<string, string[]> = {};

  for (const node of workflow.nodes) {
    adjacency[node.id] = [];
    reverseAdjacency[node.id] = [];
  }

  for (const edge of workflow.edges) {
    adjacency[edge.target] ??= [];
    reverseAdjacency[edge.source] ??= [];
    adjacency[edge.target].push(edge.source);
    reverseAdjacency[edge.source].push(edge.target);
  }

  for (const nodeId of Object.keys(adjacency)) {
    adjacency[nodeId] = [...new Set(adjacency[nodeId] ?? [])].sort();
  }

  for (const nodeId of Object.keys(reverseAdjacency)) {
    reverseAdjacency[nodeId] = [...new Set(reverseAdjacency[nodeId] ?? [])].sort();
  }

  return { adjacency, reverseAdjacency };
}
