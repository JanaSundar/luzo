import type { FlowBlockLike, FlowConnectionLike } from "./flow-document";

export interface GraphEdge<
  TBlock extends FlowBlockLike = FlowBlockLike,
  TConnection extends FlowConnectionLike = FlowConnectionLike,
> {
  readonly routeId: string;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly sourceHandleId: string | null;
  readonly targetHandleId: string | null;
  readonly nodeKind: TBlock["type"] | "unknown";
  readonly connection: TConnection;
}

export interface BuildAdjacencyResult<
  TBlock extends FlowBlockLike = FlowBlockLike,
  TConnection extends FlowConnectionLike = FlowConnectionLike,
> {
  readonly adjacencyOut: ReadonlyMap<string, readonly GraphEdge<TBlock, TConnection>[]>;
  readonly indegreeByNode: ReadonlyMap<string, number>;
  readonly edgeById: ReadonlyMap<string, GraphEdge<TBlock, TConnection>>;
  readonly blockById: ReadonlyMap<string, TBlock>;
}

export interface BuildReverseAdjacencyResult<
  TBlock extends FlowBlockLike = FlowBlockLike,
  TConnection extends FlowConnectionLike = FlowConnectionLike,
> {
  readonly adjacencyIn: ReadonlyMap<string, readonly GraphEdge<TBlock, TConnection>[]>;
}

export interface CycleDetectionResult {
  readonly hasCycle: boolean;
  readonly cyclePath?: readonly string[];
}

export interface TopoSortResult {
  readonly order: readonly string[];
  readonly hadCycle: boolean;
}

export interface FlowGraphIndex<
  TBlock extends FlowBlockLike = FlowBlockLike,
  TConnection extends FlowConnectionLike = FlowConnectionLike,
> {
  readonly nodeIndexById: ReadonlyMap<string, number>;
  readonly nodeIdByIndex: readonly string[];
  readonly blockById: ReadonlyMap<string, TBlock>;
  readonly adjacencyOut: ReadonlyMap<string, readonly GraphEdge<TBlock, TConnection>[]>;
  readonly adjacencyIn: ReadonlyMap<string, readonly GraphEdge<TBlock, TConnection>[]>;
  readonly routeById: ReadonlyMap<string, GraphEdge<TBlock, TConnection>>;
  readonly routeBySourceAndHandle: ReadonlyMap<string, ReadonlyMap<string, string>>;
  readonly conditionRoutesByNode: ReadonlyMap<string, readonly string[]>;
  readonly topoOrder: readonly string[];
  readonly descendantBitsetByNode?: ReadonlyMap<string, Uint32Array>;
  readonly ancestorBitsetByNode?: ReadonlyMap<string, Uint32Array>;
}

export interface RouteMetadata<
  TBlock extends FlowBlockLike = FlowBlockLike,
  TConnection extends FlowConnectionLike = FlowConnectionLike,
> {
  readonly routeById: ReadonlyMap<string, GraphEdge<TBlock, TConnection>>;
  readonly routeBySourceAndHandle: ReadonlyMap<string, ReadonlyMap<string, string>>;
  readonly conditionRoutesByNode: ReadonlyMap<string, readonly string[]>;
}
