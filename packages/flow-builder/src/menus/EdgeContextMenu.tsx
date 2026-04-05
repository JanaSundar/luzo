import type { ReactNode } from "react";
import type { FlowEdge } from "@luzo/flow-types";

import { MenuSurface } from "./MenuSurface";

interface EdgeContextMenuProps {
  anchor: { x: number; y: number };
  close: () => void;
  edge: FlowEdge;
  onCopyId: () => void;
  onDelete: () => void;
  renderEdgeContextMenu?: (edge: FlowEdge, close: () => void) => ReactNode;
}

export function EdgeContextMenu({
  anchor,
  close,
  edge,
  onCopyId,
  onDelete,
  renderEdgeContextMenu,
}: EdgeContextMenuProps) {
  if (renderEdgeContextMenu) {
    return (
      <MenuSurface anchor={anchor} onClose={close}>
        {renderEdgeContextMenu(edge, close)}
      </MenuSurface>
    );
  }

  return (
    <MenuSurface anchor={anchor} onClose={close}>
      <div style={sectionLabelStyle}>Edge</div>
      <button
        type="button"
        onClick={() => {
          onCopyId();
          close();
        }}
        style={buttonStyle}
      >
        Copy edge id
      </button>
      <button
        type="button"
        onClick={() => {
          onDelete();
          close();
        }}
        style={{ ...buttonStyle, color: "var(--fb-edge-delete-text, #b91c1c)" }}
      >
        Delete edge
      </button>
      {edge.label ? <div style={edgeLabelStyle}>{edge.label}</div> : null}
    </MenuSurface>
  );
}

const buttonStyle = {
  background: "transparent",
  border: 0,
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 12,
  lineHeight: 1.3,
  padding: "7px 10px",
  textAlign: "left" as const,
  width: "100%",
};

const sectionLabelStyle = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.14em",
  opacity: 0.6,
  padding: "4px 10px 6px",
  textTransform: "uppercase" as const,
};

const edgeLabelStyle = {
  fontSize: 11,
  opacity: 0.6,
  padding: "6px 10px 2px",
};
