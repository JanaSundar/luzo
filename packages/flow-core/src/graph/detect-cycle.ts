import type { CycleDetectionResult, GraphEdge } from "../contracts/graph";

export function detectCycle(params: {
  nodeIds: readonly string[];
  adjacencyOut: ReadonlyMap<string, readonly GraphEdge[]>;
}): CycleDetectionResult {
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  const visit = (nodeId: string): readonly string[] | null => {
    if (inStack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      return [...path.slice(cycleStart), nodeId];
    }

    if (visited.has(nodeId)) return null;

    visited.add(nodeId);
    inStack.add(nodeId);
    path.push(nodeId);

    for (const edge of params.adjacencyOut.get(nodeId) ?? []) {
      const cyclePath = visit(edge.targetNodeId);
      if (cyclePath) return cyclePath;
    }

    path.pop();
    inStack.delete(nodeId);
    return null;
  };

  for (const nodeId of params.nodeIds) {
    const cyclePath = visit(nodeId);
    if (cyclePath) return { hasCycle: true, cyclePath };
  }

  return { hasCycle: false };
}
