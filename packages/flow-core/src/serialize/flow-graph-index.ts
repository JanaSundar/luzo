import type { FlowBlockLike } from "../contracts/flow-document";

export interface SerializedFlowGraphIndex<
  TBlock extends FlowBlockLike = FlowBlockLike,
  TRoute = unknown,
> {
  nodeIndexById: Record<string, number>;
  nodeIdByIndex: string[];
  blockById: Record<string, TBlock>;
  adjacencyOut: Record<string, TRoute[]>;
  adjacencyIn: Record<string, TRoute[]>;
  routeById: Record<string, TRoute>;
  routeBySourceAndHandle: Record<string, Record<string, string>>;
  conditionRoutesByNode: Record<string, string[]>;
  topoOrder: string[];
  descendantBitsets: ArrayBuffer;
  ancestorBitsets: ArrayBuffer;
  wordCount: number;
}

export function serializeFlowGraphIndex<TBlock extends FlowBlockLike, TRoute>(index: {
  nodeIndexById: ReadonlyMap<string, number>;
  nodeIdByIndex: readonly string[];
  blockById: ReadonlyMap<string, TBlock>;
  adjacencyOut: ReadonlyMap<string, readonly TRoute[]>;
  adjacencyIn: ReadonlyMap<string, readonly TRoute[]>;
  routeById: ReadonlyMap<string, TRoute>;
  routeBySourceAndHandle: ReadonlyMap<string, ReadonlyMap<string, string>>;
  conditionRoutesByNode: ReadonlyMap<string, readonly string[]>;
  topoOrder: readonly string[];
  descendantBitsetByNode?: ReadonlyMap<string, Uint32Array>;
  ancestorBitsetByNode?: ReadonlyMap<string, Uint32Array>;
}): {
  data: SerializedFlowGraphIndex<TBlock, TRoute>;
  transferables: Transferable[];
} {
  const nodeIdByIndex = [...index.nodeIdByIndex];
  const emptyBitsets = new Map<string, Uint32Array>();
  const wordCount = Math.max(1, Math.ceil(nodeIdByIndex.length / 32));
  const descendantBitsets = packBitsets(
    index.descendantBitsetByNode ?? emptyBitsets,
    nodeIdByIndex,
    wordCount,
  );
  const ancestorBitsets = packBitsets(
    index.ancestorBitsetByNode ?? emptyBitsets,
    nodeIdByIndex,
    wordCount,
  );

  return {
    data: {
      nodeIndexById: Object.fromEntries(index.nodeIndexById),
      nodeIdByIndex,
      blockById: Object.fromEntries(index.blockById) as Record<string, TBlock>,
      adjacencyOut: mapToRecord(index.adjacencyOut, (edges) => [...edges]),
      adjacencyIn: mapToRecord(index.adjacencyIn, (edges) => [...edges]),
      routeById: Object.fromEntries(index.routeById) as Record<string, TRoute>,
      routeBySourceAndHandle: mapToRecord(index.routeBySourceAndHandle, (byHandle) =>
        Object.fromEntries(byHandle),
      ),
      conditionRoutesByNode: mapToRecord(index.conditionRoutesByNode, (routeIds) => [...routeIds]),
      topoOrder: [...index.topoOrder],
      descendantBitsets,
      ancestorBitsets,
      wordCount,
    },
    transferables: [descendantBitsets, ancestorBitsets],
  };
}

export function deserializeFlowGraphIndex<TBlock extends FlowBlockLike, TRoute>(
  serialized: SerializedFlowGraphIndex<TBlock, TRoute>,
): {
  nodeIndexById: Map<string, number>;
  nodeIdByIndex: string[];
  blockById: Map<string, TBlock>;
  adjacencyOut: Map<string, TRoute[]>;
  adjacencyIn: Map<string, TRoute[]>;
  routeById: Map<string, TRoute>;
  routeBySourceAndHandle: Map<string, Map<string, string>>;
  conditionRoutesByNode: Map<string, string[]>;
  topoOrder: string[];
  descendantBitsetByNode: Map<string, Uint32Array>;
  ancestorBitsetByNode: Map<string, Uint32Array>;
} {
  const { nodeIdByIndex, wordCount } = serialized;

  return {
    nodeIndexById: new Map(Object.entries(serialized.nodeIndexById)),
    nodeIdByIndex,
    blockById: new Map(Object.entries(serialized.blockById)) as Map<string, TBlock>,
    adjacencyOut: new Map(Object.entries(serialized.adjacencyOut)),
    adjacencyIn: new Map(Object.entries(serialized.adjacencyIn)),
    routeById: new Map(Object.entries(serialized.routeById)),
    routeBySourceAndHandle: new Map(
      Object.entries(serialized.routeBySourceAndHandle).map(([nodeId, byHandle]) => [
        nodeId,
        new Map(Object.entries(byHandle)),
      ]),
    ),
    conditionRoutesByNode: new Map(Object.entries(serialized.conditionRoutesByNode)),
    topoOrder: serialized.topoOrder,
    descendantBitsetByNode: unpackBitsets(serialized.descendantBitsets, nodeIdByIndex, wordCount),
    ancestorBitsetByNode: unpackBitsets(serialized.ancestorBitsets, nodeIdByIndex, wordCount),
  };
}

function packBitsets(
  byNode: ReadonlyMap<string, Uint32Array>,
  nodeIdByIndex: readonly string[],
  wordCount: number,
) {
  const buffer = new ArrayBuffer(nodeIdByIndex.length * wordCount * 4);
  const view = new Uint32Array(buffer);
  for (let i = 0; i < nodeIdByIndex.length; i++) {
    const nodeId = nodeIdByIndex[i];
    if (!nodeId) continue;
    const bitset = byNode.get(nodeId);
    if (bitset) view.set(bitset, i * wordCount);
  }
  return buffer;
}

function unpackBitsets(buffer: ArrayBuffer, nodeIdByIndex: readonly string[], wordCount: number) {
  const byNode = new Map<string, Uint32Array>();
  for (let i = 0; i < nodeIdByIndex.length; i++) {
    const nodeId = nodeIdByIndex[i];
    if (!nodeId) continue;
    byNode.set(nodeId, new Uint32Array(buffer, i * wordCount * 4, wordCount));
  }
  return byNode;
}

function mapToRecord<K extends string, V, N>(
  map: ReadonlyMap<K, V>,
  normalize: (value: V) => N,
): Record<K, N> {
  return Object.fromEntries(
    Array.from(map.entries(), ([key, value]) => [key, normalize(value)]),
  ) as Record<K, N>;
}
