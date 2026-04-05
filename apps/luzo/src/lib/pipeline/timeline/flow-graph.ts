import type { FlowBlock, FlowConnection, FlowDocument } from "@/features/flow-editor/domain/types";
import {
  bitsetToNodeIds,
  buildGraphIndex,
  createNodeMembershipBitset,
  getRouteScopeBitset,
  hasAnyBit,
  hasBit,
  intersectBitsets,
  subtractBitsets,
  type GraphEdge,
} from "@luzo/flow-core";

export interface TimelineRouteEdge {
  routeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandleId: string | null;
  targetHandleId: string | null;
  nodeKind: FlowBlock["type"] | "unknown";
}

export interface FlowGraphIndex {
  nodeIndexById: Map<string, number>;
  nodeIdByIndex: string[];
  blockById: Map<string, FlowBlock>;
  adjacencyOut: Map<string, TimelineRouteEdge[]>;
  adjacencyIn: Map<string, TimelineRouteEdge[]>;
  routeById: Map<string, TimelineRouteEdge>;
  routeBySourceAndHandle: Map<string, Map<string, string>>;
  conditionRoutesByNode: Map<string, string[]>;
  topoOrder: string[];
  descendantBitsetByNode: Map<string, Uint32Array>;
  ancestorBitsetByNode: Map<string, Uint32Array>;
}

export function buildFlowGraphIndex(flow?: FlowDocument | null): FlowGraphIndex | null {
  const index = buildGraphIndex({ document: flow, includeBitsets: true });
  if (!index?.descendantBitsetByNode || !index.ancestorBitsetByNode) return null;

  return {
    nodeIndexById: new Map(index.nodeIndexById),
    nodeIdByIndex: [...index.nodeIdByIndex],
    blockById: new Map(index.blockById) as Map<string, FlowBlock>,
    adjacencyOut: toMutableEdgeMap(index.adjacencyOut),
    adjacencyIn: toMutableEdgeMap(index.adjacencyIn),
    routeById: new Map(index.routeById) as Map<string, TimelineRouteEdge>,
    routeBySourceAndHandle: cloneMapValues(
      index.routeBySourceAndHandle,
      (byHandle) => new Map(byHandle),
    ),
    conditionRoutesByNode: cloneMapValues(index.conditionRoutesByNode, (routeIds) => [...routeIds]),
    topoOrder: [...index.topoOrder],
    descendantBitsetByNode: new Map(index.descendantBitsetByNode),
    ancestorBitsetByNode: new Map(index.ancestorBitsetByNode),
  };
}

export {
  bitsetToNodeIds,
  createNodeMembershipBitset,
  getRouteScopeBitset,
  hasAnyBit,
  hasBit,
  intersectBitsets,
  subtractBitsets,
};

function toMutableEdgeMap(
  input: ReadonlyMap<string, readonly GraphEdge<FlowBlock, FlowConnection>[]>,
) {
  return cloneMapValues(
    input,
    (edges) => edges.map((edge) => ({ ...edge })) as TimelineRouteEdge[],
  );
}

function cloneMapValues<K, V, N>(input: ReadonlyMap<K, V>, clone: (value: V) => N) {
  return new Map(Array.from(input.entries(), ([key, value]) => [key, clone(value)]));
}
