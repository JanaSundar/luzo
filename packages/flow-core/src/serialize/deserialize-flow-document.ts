import type { FlowDocumentLike } from "../contracts/flow-document";

export function deserializeFlowDocument<TDocument extends FlowDocumentLike>(params: {
  serialized: string;
}) {
  return JSON.parse(params.serialized) as TDocument;
}
