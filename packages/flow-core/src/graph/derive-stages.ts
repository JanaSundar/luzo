/**
 * Given a topological order and a predecessor adjacency map, group nodes into
 * parallel execution stages. Nodes in the same stage have no dependency on each
 * other and can be executed concurrently.
 *
 * @param order - Node IDs in topological order (dependencies first).
 * @param adjacency - Map of nodeId → list of prerequisite node IDs.
 */
export function deriveStages(order: string[], adjacency: Record<string, string[]>): string[][] {
  const depthByNode: Record<string, number> = {};
  const stages: string[][] = [];

  for (const nodeId of order) {
    const deps = adjacency[nodeId] ?? [];
    const depth =
      deps.length > 0 ? Math.max(...deps.map((depId) => (depthByNode[depId] ?? 0) + 1)) : 0;
    depthByNode[nodeId] = depth;
    stages[depth] ??= [];
    stages[depth].push(nodeId);
  }

  return stages.filter((stage) => stage.length > 0);
}
