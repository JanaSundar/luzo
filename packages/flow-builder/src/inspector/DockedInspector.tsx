import type { ReactNode } from "react";
import type { BlockRegistry, FlowNode } from "@luzo/flow-types";

import { getNodeLabel } from "../nodes/cardUtils";

interface DockedInspectorProps {
  blockRegistry: BlockRegistry;
  emptyState?: ReactNode;
  node: FlowNode | null;
  onClose: () => void;
  onUpdate: (nodeId: string, patch: Record<string, unknown>) => void;
  readOnly?: boolean;
  selected: boolean;
  titleResolver?: (node: FlowNode) => string;
  width?: number | string;
}

export function DockedInspector({
  blockRegistry,
  emptyState,
  node,
  onClose,
  onUpdate,
  readOnly,
  selected,
  titleResolver,
  width,
}: DockedInspectorProps) {
  const inspectorRenderer = node ? blockRegistry[node.type]?.renderInspector : undefined;
  const content =
    node && inspectorRenderer
      ? (inspectorRenderer(node, {
          onUpdate,
          readOnly: Boolean(readOnly),
          selected,
        }) as ReactNode)
      : (emptyState ?? null);

  if (!content || !node) return null;

  return (
    <aside
      aria-label={`${node.type} inspector`}
      role="complementary"
      onPointerDownCapture={(event) => event.stopPropagation()}
      onWheelCapture={(event) => event.stopPropagation()}
      style={{
        background: "var(--fb-inspector-bg, rgba(255, 255, 255, 0.96))",
        border: "1px solid var(--fb-inspector-border, rgba(148, 163, 184, 0.22))",
        borderRadius: 24,
        bottom: 16,
        boxShadow: "var(--fb-inspector-shadow, 0 18px 48px rgba(15, 23, 42, 0.14))",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "absolute",
        right: 16,
        top: 16,
        width: width ?? 420,
        zIndex: 5,
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: "var(--fb-inspector-header-bg, rgba(248, 250, 252, 0.98))",
          borderBottom: "1px solid var(--fb-inspector-border, rgba(148, 163, 184, 0.22))",
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
          padding: "16px 18px",
        }}
      >
        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
          <div
            style={{
              color: "var(--fb-text-secondary, #475569)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Block editor
          </div>
          <div
            style={{
              color: "var(--fb-text-primary, #0f172a)",
              fontSize: 15,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {titleResolver?.(node) ?? getNodeLabel(node)}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "1px solid var(--fb-inspector-border, rgba(148, 163, 184, 0.22))",
            borderRadius: 999,
            color: "var(--fb-text-secondary, #475569)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            padding: "8px 12px",
          }}
        >
          Close
        </button>
      </div>
      <div
        data-testid="flow-builder-inspector-body"
        onTouchMoveCapture={(event) => event.stopPropagation()}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          overflowX: "hidden",
          overscrollBehavior: "contain",
          padding: 18,
        }}
      >
        <div key={node.id} style={{ display: "grid", gap: 16, minWidth: 0 }}>
          {content}
        </div>
      </div>
    </aside>
  );
}
