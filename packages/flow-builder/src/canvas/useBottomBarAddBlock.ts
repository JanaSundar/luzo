import { useCallback } from "react";
import type { BlockRegistry, FlowNode, FlowSize, FlowTransform } from "@luzo/flow-types";

import { screenToCanvas } from "../utils/geometry";

interface UseBottomBarAddBlockOptions {
  blockRegistry: BlockRegistry;
  canvasRect: () => DOMRect | null;
  nodes: FlowNode[];
  openSuggestionMenu: (
    menu: {
      anchor: { x: number; y: number };
      anchorEdge?: "top" | "bottom";
      payload: { position: { x: number; y: number }; sourceNodeId: string; sourceHandleId: string };
    } | null,
  ) => void;
  readOnly?: boolean;
  transform: FlowTransform;
  viewport: FlowSize;
}

export function useBottomBarAddBlock({
  blockRegistry,
  canvasRect,
  nodes,
  openSuggestionMenu,
  readOnly,
  transform,
  viewport,
}: UseBottomBarAddBlockOptions) {
  return useCallback(
    (anchor?: { x: number; y: number }) => {
      if (readOnly) return;

      const rect = canvasRect();
      if (!rect) return;

      // Anchor the bottom-centre of the menu just above the bottom bar
      // (bar sits 20 px from canvas bottom with 56 px height → top edge at –76 px;
      // leave an 8 px gap → –84 px).
      const point = anchor ?? { x: rect.left + rect.width / 2, y: rect.bottom - 84 };
      openSuggestionMenu({
        anchor: point,
        anchorEdge: "bottom",
        payload: {
          position: screenToCanvas(
            { x: viewport.width / 2, y: viewport.height / 2 },
            { width: viewport.width, height: viewport.height, transform },
          ),
          // Empty source fields — the user will draw the connection manually.
          sourceHandleId: "",
          sourceNodeId: "",
        },
      });
    },
    [blockRegistry, canvasRect, nodes, openSuggestionMenu, readOnly, transform, viewport],
  );
}
