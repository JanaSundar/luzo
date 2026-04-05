import type {
  FlowPosition,
  FlowRect,
  FlowSize,
  FlowTransform,
  FlowViewport,
} from "@luzo/flow-types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function screenToCanvas(position: FlowPosition, viewport: FlowViewport): FlowPosition {
  const { x, y, scale } = viewport.transform;
  return {
    x: (position.x - x) / scale,
    y: (position.y - y) / scale,
  };
}

export function canvasToScreen(position: FlowPosition, transform: FlowTransform): FlowPosition {
  return {
    x: position.x * transform.scale + transform.x,
    y: position.y * transform.scale + transform.y,
  };
}

export function getRectContainsPoint(rect: FlowRect, point: FlowPosition) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function getFitTransform(bounds: FlowRect, viewport: FlowSize): FlowTransform {
  const padding = 80;
  const safeWidth = Math.max(bounds.width, 1);
  const safeHeight = Math.max(bounds.height, 1);
  const scale = clamp(
    Math.min(
      (viewport.width - padding * 2) / safeWidth,
      (viewport.height - padding * 2) / safeHeight,
    ),
    0.2,
    1.4,
  );

  const x = viewport.width / 2 - (bounds.x + bounds.width / 2) * scale;
  const y = viewport.height / 2 - (bounds.y + bounds.height / 2) * scale;

  return { x, y, scale };
}

export function getNodeBounds(position: FlowPosition, width = 260, height = 180): FlowRect {
  return { x: position.x, y: position.y, width, height };
}

export function expandRect(rects: FlowRect[]): FlowRect | null {
  if (rects.length === 0) return null;

  const x = Math.min(...rects.map((rect) => rect.x));
  const y = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));

  return { x, y, width: maxX - x, height: maxY - y };
}
