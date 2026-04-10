import type { Connection, FlowEdge, FlowNode } from "@luzo/flow-types";

export interface ConnectionValidationContext {
  edges: FlowEdge[];
  nodes: FlowNode[];
}

export type ConnectionValidator = (
  connection: Connection,
  context: ConnectionValidationContext,
) => boolean;

export function canCreateConnection(
  connection: Connection,
  context: ConnectionValidationContext,
  validator?: ConnectionValidator,
) {
  if (!connection.source || !connection.target) {
    return false;
  }

  if (!validator) {
    return true;
  }

  return validator(connection, context);
}
