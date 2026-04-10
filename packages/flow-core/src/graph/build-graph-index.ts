import type { FlowGraphIndex, GraphEdge, RouteMetadata } from "../contracts/graph";
import type {
  FlowBlockLike,
  FlowConnectionLike,
  FlowDocumentLike,
} from "../contracts/flow-document";
import { buildAdjacency } from "./build-adjacency";
import { buildReverseAdjacency } from "./build-reverse-adjacency";
import { cloneBitset, createEmptyBitset, orInto, setBit } from "./bitset";
import { topoSort } from "./topo-sort";

export function buildGraphIndex<
  TBlock extends FlowBlockLike,
  TConnection extends FlowConnectionLike,
>(params: {
  document?: FlowDocumentLike<TBlock, TConnection> | null;
  includeBitsets?: boolean;
}): FlowGraphIndex<TBlock, TConnection> | null {
  const { document, includeBitsets = true } = params;
  if (!document || document.blocks.length === 0) return null;

  const nodeIdByIndex = document.blocks.map((block) => block.id);
  const nodeIndexById = new Map(nodeIdByIndex.map((id, index) => [id, index] as const));
  const forward = buildAdjacency({ document });
  const reverse = buildReverseAdjacency({ adjacencyOut: forward.adjacencyOut });
  const routeMetadata = buildRouteMetadata({
    adjacencyOut: forward.adjacencyOut,
    blockById: forward.blockById,
  });
  const topoOrder = topoSort({
    nodeIds: nodeIdByIndex,
    indegreeByNode: forward.indegreeByNode,
    getNeighbors: (id) => (forward.adjacencyOut.get(id) ?? []).map((edge) => edge.targetNodeId),
  }).order;

  const index: FlowGraphIndex<TBlock, TConnection> = {
    nodeIndexById,
    nodeIdByIndex,
    blockById: forward.blockById,
    adjacencyOut: forward.adjacencyOut,
    adjacencyIn: reverse.adjacencyIn,
    routeById: routeMetadata.routeById,
    routeBySourceAndHandle: routeMetadata.routeBySourceAndHandle,
    conditionRoutesByNode: routeMetadata.conditionRoutesByNode,
    topoOrder,
  };

  if (!includeBitsets) return index;

  return {
    ...index,
    descendantBitsetByNode: buildRelationBitsets(
      nodeIdByIndex,
      nodeIndexById,
      forward.adjacencyOut,
      topoOrder,
      false,
    ),
    ancestorBitsetByNode: buildRelationBitsets(
      nodeIdByIndex,
      nodeIndexById,
      reverse.adjacencyIn,
      topoOrder,
      true,
    ),
  };
}

export function buildRouteMetadata<
  TBlock extends FlowBlockLike,
  TConnection extends FlowConnectionLike,
>(params: {
  adjacencyOut: ReadonlyMap<string, readonly GraphEdge<TBlock, TConnection>[]>;
  blockById: ReadonlyMap<string, TBlock>;
}): RouteMetadata<TBlock, TConnection> {
  const routeById = new Map<string, GraphEdge<TBlock, TConnection>>();
  const routeBySourceAndHandle = new Map<string, Map<string, string>>();
  const conditionRoutesByNode = new Map<string, string[]>();

  for (const [sourceNodeId, edges] of params.adjacencyOut) {
    for (const edge of edges) {
      routeById.set(edge.routeId, edge);
      if (edge.sourceHandleId)
        appendMapEntry(routeBySourceAndHandle, sourceNodeId, edge.sourceHandleId, edge.routeId);

      if (params.blockById.get(sourceNodeId)?.type === "if") {
        appendMapArray(conditionRoutesByNode, sourceNodeId, edge.routeId);
      }
    }
  }

  return { routeById, routeBySourceAndHandle, conditionRoutesByNode };
}

function buildRelationBitsets<TBlock extends FlowBlockLike, TConnection extends FlowConnectionLike>(
  nodeIds: readonly string[],
  nodeIndexById: ReadonlyMap<string, number>,
  adjacency: ReadonlyMap<string, readonly GraphEdge<TBlock, TConnection>[]>,
  topoOrder: readonly string[],
  forward: boolean,
) {
  const byNode = new Map<string, Uint32Array>(
    nodeIds.map((id) => [id, createEmptyBitset(nodeIds.length)] as const),
  );
  const source = forward ? topoOrder : [...topoOrder].reverse();

  for (const nodeId of source) {
    const next = cloneBitset(byNode.get(nodeId), nodeIds.length);
    for (const edge of adjacency.get(nodeId) ?? []) {
      const relatedId = forward ? edge.sourceNodeId : edge.targetNodeId;
      setBit(next, nodeIndexById.get(relatedId));
      orInto(next, byNode.get(relatedId));
    }
    byNode.set(nodeId, next);
  }

  return byNode;
}

function appendMapArray<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const values = map.get(key);
  if (values) values.push(value);
  else map.set(key, [value]);
}

function appendMapEntry<K1, K2, V>(map: Map<K1, Map<K2, V>>, key: K1, nestedKey: K2, value: V) {
  const nested = map.get(key);
  if (nested) nested.set(nestedKey, value);
  else map.set(key, new Map([[nestedKey, value]]));
}
