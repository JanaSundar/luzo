import type { PointerEvent as ReactPointerEvent } from "react";
import type { Handle as FlowHandle } from "@luzo/flow-types";

import { getHandlePositionStyles } from "../../utils/handles";

interface HandleProps {
  handle: FlowHandle;
  index: number;
  nodeId: string;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, handle: FlowHandle) => void;
  total: number;
}

export function Handle({ handle, index, nodeId, onPointerDown, total }: HandleProps) {
  const positionStyles = getHandlePositionStyles(handle.position, index, total);
  const background =
    handle.id === "success" || handle.id === "true"
      ? "var(--fb-handle-success, #16a34a)"
      : handle.id === "fail" || handle.id === "false"
        ? "var(--fb-handle-fail, #dc2626)"
        : "var(--fb-handle-color, #94a3b8)";

  return (
    <button
      type="button"
      aria-label={`Connect ${handle.type} ${handle.label ?? handle.id}`}
      data-flow-handle="true"
      data-node-id={nodeId}
      data-handle-id={handle.id}
      data-handle-type={handle.type}
      onPointerDown={(event) => onPointerDown(event, handle)}
      style={{
        ...positionStyles,
        alignItems: "center",
        background,
        border: "2px solid var(--fb-node-bg, #fff)",
        borderRadius: 999,
        display: "flex",
        height: "var(--fb-handle-size, 12px)",
        justifyContent: "center",
        position: "absolute",
        width: "var(--fb-handle-size, 12px)",
        zIndex: 3,
      }}
    />
  );
}
