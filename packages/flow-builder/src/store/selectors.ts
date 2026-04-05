import type { FlowNode, FlowPosition } from "@luzo/flow-types";

import { getNodeMinWidth } from "../nodes/cardUtils";

export function getDisplayPosition(
  node: FlowNode,
  draggingPositions: Record<string, FlowPosition>,
) {
  return draggingPositions[node.id] ?? node.position;
}

export function getNodeSize(
  node: FlowNode,
  nodeSizes: Record<string, { width: number; height: number }>,
) {
  return (
    nodeSizes[node.id] ?? {
      width: node.width ?? getNodeMinWidth(node),
      height: node.height ?? 180,
    }
  );
}
