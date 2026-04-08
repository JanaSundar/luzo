import type {
  FlowBlockLike,
  FlowConnectionLike,
  FlowDocumentLike,
  FlowPosition,
} from "../contracts/flow-document";

interface NodeShape {
  readonly id: string;
  readonly type: string;
  readonly position: FlowPosition;
  readonly data: unknown;
}

type NodeChangeLike =
  | { readonly type: "add"; readonly item: NodeShape }
  | { readonly type: "remove"; readonly id: string }
  | { readonly type: "replace"; readonly id: string; readonly item: NodeShape }
  | {
      readonly type: "position";
      readonly id: string;
      readonly position: FlowPosition;
      readonly dragging?: boolean;
    }
  | { readonly type: "select"; readonly id: string; readonly selected: boolean }
  | {
      readonly type: "dimensions";
      readonly id: string;
      readonly width: number;
      readonly height: number;
    };

export function applyNodeChanges<
  TBlock extends FlowBlockLike,
  TConnection extends FlowConnectionLike,
>(params: {
  document: FlowDocumentLike<TBlock, TConnection>;
  changes: readonly NodeChangeLike[];
}): FlowDocumentLike<TBlock, TConnection> {
  return params.changes.reduce((current, change) => {
    switch (change.type) {
      case "position":
        return {
          ...current,
          blocks: current.blocks.map((block) =>
            block.id === change.id ? ({ ...block, position: change.position } as TBlock) : block,
          ),
        };
      case "replace":
        return {
          ...current,
          blocks: current.blocks.map((block) =>
            block.id === change.id ? mergeBlock(block, change.item) : block,
          ),
        };
      case "add":
        return { ...current, blocks: [...current.blocks, toBlock(change.item)] };
      case "remove":
        return {
          ...current,
          blocks: current.blocks.filter((block) => block.id !== change.id),
          connections: current.connections.filter(
            (connection) =>
              (connection as { readonly sourceBlockId: string }).sourceBlockId !== change.id &&
              (connection as { readonly targetBlockId: string }).targetBlockId !== change.id,
          ),
        };
      case "select":
      case "dimensions":
      default:
        return current;
    }
  }, params.document);
}

function toBlock<TBlock extends FlowBlockLike>(node: NodeShape) {
  return {
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
  } as TBlock;
}

function mergeBlock<TBlock extends FlowBlockLike>(current: TBlock, node: NodeShape) {
  return {
    ...current,
    position: node.position,
    data:
      typeof current.data === "object" && current.data !== null && typeof node.data === "object"
        ? {
            ...(current.data as Record<string, unknown>),
            ...(node.data as Record<string, unknown>),
          }
        : node.data,
  } as TBlock;
}
