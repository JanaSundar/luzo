import { useCallback } from "react";
import type { FlowNode, FlowSize, FlowTransform } from "@luzo/flow-types";

import { clamp, expandRect, getFitTransform, getNodeBounds } from "../utils/geometry";

export function useCanvasControls(
  nodes: FlowNode[],
  viewport: FlowSize,
  transform: FlowTransform,
  setTransform: (transform: FlowTransform) => void,
) {
  const zoomTo = useCallback(
    (nextScale: number) => {
      const scale = clamp(nextScale, 0.2, 1.8);
      const centerX = viewport.width / 2;
      const centerY = viewport.height / 2;
      const scaleRatio = scale / transform.scale;
      setTransform({
        scale,
        x: centerX - (centerX - transform.x) * scaleRatio,
        y: centerY - (centerY - transform.y) * scaleRatio,
      });
    },
    [setTransform, transform.scale, transform.x, transform.y, viewport.height, viewport.width],
  );
  const fitView = useCallback(() => {
    const bounds = expandRect(
      nodes.map((node) => getNodeBounds(node.position, node.width ?? 260, node.height ?? 180)),
    );

    if (!bounds) return;
    setTransform(getFitTransform(bounds, viewport));
  }, [nodes, setTransform, viewport]);

  const zoomIn = useCallback(() => zoomTo(transform.scale + 0.12), [transform.scale, zoomTo]);
  const zoomOut = useCallback(() => zoomTo(transform.scale - 0.12), [transform.scale, zoomTo]);

  return { fitView, zoomIn, zoomOut };
}
