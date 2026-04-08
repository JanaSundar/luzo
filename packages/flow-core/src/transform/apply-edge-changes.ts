import type {
  FlowBlockLike,
  FlowConnectionLike,
  FlowDocumentLike,
} from "../contracts/flow-document";

interface EdgeShape {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly sourceHandle?: string;
  readonly targetHandle?: string;
  readonly type?: "default" | "variable" | "conditional";
}

type EdgeChangeLike =
  | { readonly type: "add"; readonly item: EdgeShape }
  | { readonly type: "remove"; readonly id: string }
  | { readonly type: "replace"; readonly id: string; readonly item: EdgeShape }
  | { readonly type: "select"; readonly id: string; readonly selected: boolean };

export function applyEdgeChanges<
  TBlock extends FlowBlockLike,
  TConnection extends FlowConnectionLike,
>(params: {
  document: FlowDocumentLike<TBlock, TConnection>;
  changes: readonly EdgeChangeLike[];
}): FlowDocumentLike<TBlock, TConnection> {
  return params.changes.reduce((current, change) => {
    switch (change.type) {
      case "replace":
        return {
          ...current,
          connections: current.connections.map((connection) =>
            connection.id === change.id ? toConnection<TConnection>(change.item) : connection,
          ),
        };
      case "add":
        return {
          ...current,
          connections: [...current.connections, toConnection<TConnection>(change.item)],
        };
      case "remove":
        return {
          ...current,
          connections: current.connections.filter((connection) => connection.id !== change.id),
        };
      case "select":
      default:
        return current;
    }
  }, params.document);
}

function toConnection<TConnection extends FlowConnectionLike>(edge: EdgeShape) {
  const kind: "control" | "variable" | "conditional" =
    edge.type === "variable" ? "variable" : edge.type === "conditional" ? "conditional" : "control";

  return {
    id: edge.id,
    sourceBlockId: edge.source,
    sourceHandleId: edge.sourceHandle,
    targetBlockId: edge.target,
    targetHandleId: edge.targetHandle,
    kind,
  } as TConnection;
}
