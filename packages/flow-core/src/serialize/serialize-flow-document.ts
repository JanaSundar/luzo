import type { FlowDocumentLike } from "../contracts/flow-document";

export function serializeFlowDocument<TDocument extends FlowDocumentLike>(params: {
  document: TDocument;
}) {
  return JSON.stringify(params.document);
}
