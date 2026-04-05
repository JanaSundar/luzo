import type { MouseEvent } from "react";
import type { FlowEdge } from "@luzo/flow-types";

import { getBezierPath } from "../utils/bezier";
import { getEdgeAppearance } from "./edgeAppearance";

interface EdgePathProps {
  edge: FlowEdge;
  source: { x: number; y: number };
  target: { x: number; y: number };
  onClick: () => void;
  onContextMenu: (event: MouseEvent<SVGPathElement>) => void;
}

export function EdgePath({ edge, source, target, onClick, onContextMenu }: EdgePathProps) {
  const appearance = getEdgeAppearance({
    ...(edge.selected !== undefined ? { selected: edge.selected } : {}),
    ...(edge.sourceHandle ? { sourceHandleId: edge.sourceHandle } : {}),
    ...(edge.type ? { type: edge.type } : {}),
  });
  const path = getBezierPath(source, target);

  return (
    <path
      d={path}
      data-edge-id={edge.id}
      data-edge-role="main"
      fill="none"
      markerEnd={appearance.markerEnd}
      stroke={appearance.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={appearance.dasharray}
      strokeWidth={appearance.strokeWidth}
      style={{ cursor: "pointer" }}
      onClick={onClick}
      onContextMenu={onContextMenu}
    />
  );
}
