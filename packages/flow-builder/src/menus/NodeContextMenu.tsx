import type { ReactNode } from "react";
import type { FlowNode } from "@luzo/flow-types";

import { MenuSurface } from "./MenuSurface";

interface NodeContextMenuProps {
  anchor: { x: number; y: number };
  close: () => void;
  node: FlowNode;
  onDelete: () => void;
  onDuplicate?: () => void;
  renderNodeContextMenu?: (node: FlowNode, close: () => void) => ReactNode;
}

export function NodeContextMenu({
  anchor,
  close,
  node,
  onDelete,
  onDuplicate,
  renderNodeContextMenu,
}: NodeContextMenuProps) {
  if (renderNodeContextMenu) {
    return (
      <MenuSurface anchor={anchor} onClose={close}>
        {renderNodeContextMenu(node, close)}
      </MenuSurface>
    );
  }

  return (
    <MenuSurface anchor={anchor} onClose={close}>
      <div style={sectionLabelStyle}>Node</div>
      {onDuplicate && node.type !== "start" ? (
        <button
          type="button"
          onClick={() => {
            onDuplicate();
            close();
          }}
          style={buttonStyle}
        >
          Duplicate {node.type}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          onDelete();
          close();
        }}
        style={{ ...buttonStyle, color: "var(--fb-node-delete-text, #b91c1c)" }}
      >
        Delete {node.type}
      </button>
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
