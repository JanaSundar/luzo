import type { MouseEvent } from "react";
import type { FlowEdge } from "@luzo/flow-types";

import { getBezierMidpoint, getBezierPath } from "../utils/bezier";
import { getEdgeAppearance } from "./edgeAppearance";

const ROUTE_LABELS: Record<string, string> = {
  true: "true",
  false: "false",
  success: "success",
  fail: "fail",
};

interface EdgePathProps {
  edge: FlowEdge;
  source: { x: number; y: number };
  target: { x: number; y: number };
  /** When false, the hit-area path receives no pointer events (e.g. during a connection drag). */
  interactive?: boolean;
  onClick: () => void;
  onContextMenu: (event: MouseEvent<SVGPathElement>) => void;
  onDelete?: () => void;
}

export function EdgePath({
  edge,
  source,
  target,
  interactive = true,
  onClick,
  onContextMenu,
  onDelete,
}: EdgePathProps) {
  const appearance = getEdgeAppearance({
    ...(edge.selected !== undefined ? { selected: edge.selected } : {}),
    ...(edge.sourceHandle ? { sourceHandleId: edge.sourceHandle } : {}),
    ...(edge.type ? { type: edge.type } : {}),
  });
  const path = getBezierPath(source, target);
  const mid = getBezierMidpoint(source, target);
  const routeLabel = edge.sourceHandle ? ROUTE_LABELS[edge.sourceHandle] : undefined;
  const showControls = edge.selected && interactive;

  return (
    <>
      <path
        d={path}
        data-edge-id={edge.id}
        data-edge-role="hit-area"
        fill="none"
        pointerEvents={interactive ? "stroke" : "none"}
        stroke="transparent"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={18}
        style={{ cursor: "pointer" }}
        onClick={onClick}
        onContextMenu={onContextMenu}
      />
      <path
        d={path}
        data-edge-id={edge.id}
        data-edge-role="main"
        fill="none"
        markerEnd={appearance.markerEnd}
        pointerEvents="none"
        stroke={appearance.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={appearance.dasharray}
        strokeWidth={appearance.strokeWidth}
      />
      {routeLabel && (
        <text
          x={mid.x}
          y={mid.y - 10}
          data-edge-id={edge.id}
          data-edge-role="label"
          dominantBaseline="auto"
          fill={appearance.stroke}
          fontSize={9}
          fontFamily="ui-monospace, monospace"
          fontWeight={600}
          pointerEvents="none"
          textAnchor="middle"
        >
          {routeLabel}
        </text>
      )}
      {showControls && onDelete && (
        <g
          data-edge-id={edge.id}
          data-edge-role="delete-btn"
          style={{ cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <circle
            cx={mid.x}
            cy={mid.y}
            r={9}
            fill="hsl(var(--background))"
            stroke={appearance.stroke}
            strokeWidth={1.5}
          />
          <text
            x={mid.x}
            y={mid.y}
            dominantBaseline="central"
            fill={appearance.stroke}
            fontSize={10}
            fontWeight={700}
            pointerEvents="none"
            textAnchor="middle"
          >
            ×
          </text>
        </g>
      )}
    </>
  );
}
