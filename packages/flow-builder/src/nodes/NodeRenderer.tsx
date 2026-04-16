import type { ReactNode } from "react";
import type { BlockRegistry, FlowNode } from "@luzo/flow-types";

import { FirstPartyNodeCard } from "./FirstPartyNodeCard";
import { isBuiltInNodeType } from "./cardUtils";

interface NodeRendererProps {
  blockRegistry: BlockRegistry;
  node: FlowNode;
  readOnly: boolean;
  selected: boolean;
  onUpdate: (nodeId: string, patch: Record<string, unknown>) => void;
}

export function NodeRenderer({
  blockRegistry,
  node,
  readOnly,
  selected,
  onUpdate,
}: NodeRendererProps) {
  const definition = blockRegistry[node.type];
  const builtInContent = isBuiltInNodeType(node) ? <FirstPartyNodeCard node={node} /> : null;
  const customContent = definition?.renderCard?.(node, {
    onUpdate,
    readOnly,
    selected,
  }) as ReactNode;

  return (
    <div
      style={{
        color: "var(--fb-text-primary, #111827)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: node.type === "start" ? 68 : 120,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      {customContent ?? builtInContent ?? <div style={{ opacity: 0.7 }}>No renderer</div>}
    </div>
  );
}
