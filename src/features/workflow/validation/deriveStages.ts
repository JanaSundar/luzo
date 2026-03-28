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
