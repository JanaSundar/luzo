import type { BuildAdjacencyResult, GraphEdge } from "../contracts/graph";
import type {
  FlowBlockLike,
  FlowConnectionLike,
  FlowDocumentLike,
} from "../contracts/flow-document";

export function buildAdjacency<
  TBlock extends FlowBlockLike,
  TConnection extends FlowConnectionLike,
>(params: {
  document: FlowDocumentLike<TBlock, TConnection>;
}): BuildAdjacencyResult<TBlock, TConnection> {
  const { document } = params;
  const blockById = new Map(document.blocks.map((block) => [block.id, block] as const));
  const adjacencyOut = new Map<string, GraphEdge<TBlock, TConnection>[]>();
  const indegreeByNode = new Map<string, number>(
    document.blocks.map((block) => [block.id, 0] as const),
  );
  const edgeById = new Map<string, GraphEdge<TBlock, TConnection>>();

  for (const connection of document.connections) {
    const source = blockById.get(connection.sourceBlockId);
    if (!source || !blockById.has(connection.targetBlockId)) continue;

    const edge: GraphEdge<TBlock, TConnection> = {
      routeId: connection.id,
      sourceNodeId: connection.sourceBlockId,
      targetNodeId: connection.targetBlockId,
      sourceHandleId: connection.sourceHandleId ?? null,
      targetHandleId: connection.targetHandleId ?? null,
      nodeKind: source.type,
      connection,
    };

    edgeById.set(edge.routeId, edge);
    const outgoing = adjacencyOut.get(edge.sourceNodeId);
    if (outgoing) outgoing.push(edge);
    else adjacencyOut.set(edge.sourceNodeId, [edge]);
    indegreeByNode.set(edge.targetNodeId, (indegreeByNode.get(edge.targetNodeId) ?? 0) + 1);
  }

  return {
    adjacencyOut,
    indegreeByNode,
    edgeById,
    blockById,
  };
}
