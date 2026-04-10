import type {
  FlowBlockLike,
  FlowConnectionLike,
  FlowDocumentLike,
} from "../contracts/flow-document";

export function normalizeFlow<
  TBlock extends FlowBlockLike,
  TConnection extends FlowConnectionLike,
>(params: { document: FlowDocumentLike<TBlock, TConnection> }) {
  const blockIds = new Set<string>();
  const connectionIds = new Set<string>();

  const blocks = params.document.blocks.filter((block) => {
    if (blockIds.has(block.id)) return false;
    blockIds.add(block.id);
    return true;
  });

  const connections = params.document.connections.filter((connection) => {
    if (connectionIds.has(connection.id)) return false;
    connectionIds.add(connection.id);
    return true;
  });

  return {
    document: {
      ...params.document,
      blocks,
      connections,
    },
    changesApplied:
      blocks.length !== params.document.blocks.length ||
      connections.length !== params.document.connections.length,
  };
}
