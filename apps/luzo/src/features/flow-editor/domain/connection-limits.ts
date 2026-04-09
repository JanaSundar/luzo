import type { Connection } from "@luzo/flow-types";
import type { FlowConnection } from "./types";

const SINGLE_OUTBOUND_HANDLES = new Set(["success", "fail"]);

function normalizeHandleId(handleId?: string) {
  return handleId ?? "output";
}

/**
 * Returns true if the proposed connection is allowed.
 *
 * Rules:
 * - No exact duplicate connections (same source+target+handles).
 * - `success` and `fail` source handles are single-outbound (only one edge per source handle).
 * - All target "input" handles are single-inbound UNLESS the target block ID is in
 *   `multiInputTargetIds` (blocks that accept many incoming arrows).
 */
export function canConnectWithFlowRules(
  connection: Connection,
  existingConnections: FlowConnection[],
  multiInputTargetIds?: ReadonlySet<string>,
) {
  const sourceHandleId = normalizeHandleId(connection.sourceHandle);
  const targetHandleId = normalizeHandleId(connection.targetHandle);

  // Reject exact duplicates
  if (
    existingConnections.some(
      (existing) =>
        existing.sourceBlockId === connection.source &&
        existing.targetBlockId === connection.target &&
        normalizeHandleId(existing.sourceHandleId) === sourceHandleId &&
        normalizeHandleId(existing.targetHandleId) === targetHandleId,
    )
  ) {
    return false;
  }

  // Reject if this target's input handle is already occupied and the target
  // is not in the multi-input allowlist.
  if (!multiInputTargetIds?.has(connection.target ?? "")) {
    if (
      existingConnections.some(
        (existing) =>
          existing.targetBlockId === connection.target &&
          normalizeHandleId(existing.targetHandleId) === targetHandleId,
      )
    ) {
      return false;
    }
  }

  return true;
}

export function appendConnectionWithFlowRules(
  existingConnections: FlowConnection[],
  nextConnection: FlowConnection,
  multiInputTargetIds?: ReadonlySet<string>,
) {
  const sourceHandleId = normalizeHandleId(nextConnection.sourceHandleId);
  const targetHandleId = normalizeHandleId(nextConnection.targetHandleId);

  // Remove exact duplicate
  let filtered = existingConnections.filter(
    (existing) =>
      !(
        existing.sourceBlockId === nextConnection.sourceBlockId &&
        existing.targetBlockId === nextConnection.targetBlockId &&
        normalizeHandleId(existing.sourceHandleId) === sourceHandleId &&
        normalizeHandleId(existing.targetHandleId) === targetHandleId
      ),
  );

  // Single-outbound: remove previous edge from same source handle
  if (SINGLE_OUTBOUND_HANDLES.has(sourceHandleId)) {
    filtered = filtered.filter(
      (existing) =>
        !(
          existing.sourceBlockId === nextConnection.sourceBlockId &&
          normalizeHandleId(existing.sourceHandleId) === sourceHandleId
        ),
    );
  }

  // Single-inbound: remove previous edge into same target handle (unless multi-input)
  if (!multiInputTargetIds?.has(nextConnection.targetBlockId)) {
    filtered = filtered.filter(
      (existing) =>
        !(
          existing.targetBlockId === nextConnection.targetBlockId &&
          normalizeHandleId(existing.targetHandleId) === targetHandleId
        ),
    );
  }

  return [...filtered, nextConnection];
}
