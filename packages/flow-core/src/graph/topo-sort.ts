import type { TopoSortResult } from "../contracts/graph";

export function topoSort(params: {
  nodeIds: readonly string[];
  indegreeByNode: ReadonlyMap<string, number>;
  getNeighbors: (id: string) => Iterable<string>;
  compare?: (left: string, right: string) => number;
}): TopoSortResult {
  const indegree = new Map(params.indegreeByNode);
  const queue = params.nodeIds.filter((id) => (indegree.get(id) ?? 0) === 0);
  if (params.compare) queue.sort(params.compare);

  const order: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    order.push(nodeId);

    for (const neighborId of params.getNeighbors(nodeId)) {
      const nextDegree = (indegree.get(neighborId) ?? 0) - 1;
      indegree.set(neighborId, nextDegree);
      if (nextDegree === 0) {
        queue.push(neighborId);
        if (params.compare) queue.sort(params.compare);
      }
    }
  }

  return {
    order: order.length === params.nodeIds.length ? order : params.nodeIds.slice(),
    hadCycle: order.length !== params.nodeIds.length,
  };
}

export function kahnTopoSort(
  nodeIds: string[],
  indegree: Map<string, number>,
  neighbors: (id: string) => Iterable<string>,
  compare?: (a: string, b: string) => number,
): string[] {
  return topoSort({
    nodeIds,
    indegreeByNode: indegree,
    getNeighbors: neighbors,
    ...(compare ? { compare } : {}),
  }).order.slice();
}
