import type { Handle, FlowNode, FlowPosition } from "@luzo/flow-types";

export function getHandlePosition(
  node: FlowNode,
  handle: Handle,
  handles: Handle[] = [handle],
): FlowPosition {
  const width = typeof node.width === "number" && node.width > 0 ? node.width : 260;
  const height = typeof node.height === "number" && node.height > 0 ? node.height : 180;
  const { index, total } = getHandleSlot(handle, handles);
  const ratio = getHandleSlotRatio(index, total);

  switch (handle.position) {
    case "top":
      return { x: node.position.x + width * ratio, y: node.position.y };
    case "right":
      return { x: node.position.x + width, y: node.position.y + height * ratio };
    case "bottom":
      return { x: node.position.x + width * ratio, y: node.position.y + height };
    case "left":
    default:
      return { x: node.position.x, y: node.position.y + height * ratio };
  }
}

export function getHandlePositionStyles(
  position: Handle["position"],
  index: number,
  total: number,
) {
  const offset = `${getHandleSlotRatio(index, total) * 100}%`;

  switch (position) {
    case "top":
      return { left: offset, top: -6, transform: "translateX(-50%)" };
    case "right":
      return { right: -6, top: offset, transform: "translateY(-50%)" };
    case "bottom":
      return { bottom: -6, left: offset, transform: "translateX(-50%)" };
    case "left":
    default:
      return { left: -6, top: offset, transform: "translateY(-50%)" };
  }
}

function getHandleSlot(handle: Handle, handles: Handle[]) {
  const siblings = handles.filter((entry) => entry.position === handle.position);

  return {
    index: Math.max(
      siblings.findIndex((entry) => entry.id === handle.id && entry.type === handle.type),
      0,
    ),
    total: Math.max(siblings.length, 1),
  };
}

function getHandleSlotRatio(index: number, total: number) {
  return (index + 1) / (total + 1);
}
