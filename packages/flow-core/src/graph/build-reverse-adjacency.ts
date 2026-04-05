import type { BuildReverseAdjacencyResult, GraphEdge } from "../contracts/graph";
import type { FlowBlockLike, FlowConnectionLike } from "../contracts/flow-document";

export function buildReverseAdjacency<
  TBlock extends FlowBlockLike,
  TConnection extends FlowConnectionLike,
>(params: {
  adjacencyOut: ReadonlyMap<string, readonly GraphEdge<TBlock, TConnection>[]>;
}): BuildReverseAdjacencyResult<TBlock, TConnection> {
  const adjacencyIn = new Map<string, GraphEdge<TBlock, TConnection>[]>();

  for (const edges of params.adjacencyOut.values()) {
    for (const edge of edges) {
      adjacencyIn.set(edge.targetNodeId, [...(adjacencyIn.get(edge.targetNodeId) ?? []), edge]);
    }
  }

  return { adjacencyIn };
}
