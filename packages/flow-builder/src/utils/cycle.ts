import type { FlowEdge } from "@luzo/flow-types";

export function wouldCreateCycle(
  edges: FlowEdge[],
  proposedSource: string,
  proposedTarget: string,
) {
  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    const neighbors = adjacency.get(edge.source) ?? [];
    neighbors.push(edge.target);
    adjacency.set(edge.source, neighbors);
  }

  const visited = new Set<string>();
  return isReachable(adjacency, proposedTarget, proposedSource, visited);
}

function isReachable(
  adjacency: Map<string, string[]>,
  current: string,
  target: string,
  visited: Set<string>,
): boolean {
  if (current === target) return true;
  if (visited.has(current)) return false;

  visited.add(current);
  for (const next of adjacency.get(current) ?? []) {
    if (isReachable(adjacency, next, target, visited)) {
      return true;
    }
  }

  return false;
}
