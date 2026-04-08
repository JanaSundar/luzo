import type { Connection } from "@luzo/flow-types";
import type { FlowConnection } from "./types";

const SINGLE_OUTBOUND_HANDLES = new Set(["success", "fail"]);

function normalizeHandleId(handleId?: string) {
  return handleId ?? "output";
}

export function canConnectWithFlowRules(
  connection: Connection,
  existingConnections: FlowConnection[],
) {
  const sourceHandleId = normalizeHandleId(connection.sourceHandle);

  return !existingConnections.some(
    (existing) =>
      existing.sourceBlockId === connection.source &&
      existing.targetBlockId === connection.target &&
      normalizeHandleId(existing.sourceHandleId) === sourceHandleId &&
      normalizeHandleId(existing.targetHandleId) === normalizeHandleId(connection.targetHandle),
  );
}

export function appendConnectionWithFlowRules(
  existingConnections: FlowConnection[],
  nextConnection: FlowConnection,
) {
  const sourceHandleId = normalizeHandleId(nextConnection.sourceHandleId);
  const dedupedConnections = existingConnections.filter(
    (existing) =>
      !(
        existing.sourceBlockId === nextConnection.sourceBlockId &&
        existing.targetBlockId === nextConnection.targetBlockId &&
        normalizeHandleId(existing.sourceHandleId) === sourceHandleId &&
        normalizeHandleId(existing.targetHandleId) ===
          normalizeHandleId(nextConnection.targetHandleId)
      ),
  );

  const limitedConnections = SINGLE_OUTBOUND_HANDLES.has(sourceHandleId)
    ? dedupedConnections.filter(
        (existing) =>
          !(
            existing.sourceBlockId === nextConnection.sourceBlockId &&
            normalizeHandleId(existing.sourceHandleId) === sourceHandleId
          ),
      )
    : dedupedConnections;

  return [...limitedConnections, nextConnection];
}
