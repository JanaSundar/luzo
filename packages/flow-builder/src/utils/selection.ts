import type { FlowNode, FlowRect } from "@luzo/flow-types";

import { getNodeBounds } from "./geometry";

export function getNodesInSelection(nodes: FlowNode[], selectionRect: FlowRect) {
  return nodes
    .filter((node) => {
      const bounds = getNodeBounds(node.position, node.width, node.height);
      return (
        bounds.x >= selectionRect.x &&
        bounds.y >= selectionRect.y &&
        bounds.x + bounds.width <= selectionRect.x + selectionRect.width &&
        bounds.y + bounds.height <= selectionRect.y + selectionRect.height
      );
    })
    .map((node) => node.id);
}
