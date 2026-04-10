import type { FlowPosition } from "@luzo/flow-types";

export function getBezierPath(source: FlowPosition, target: FlowPosition) {
  const deltaX = Math.abs(target.x - source.x);
  const controlOffset = Math.max(48, deltaX * 0.45);
  const sourceControlX = source.x + controlOffset;
  const targetControlX = target.x - controlOffset;

  return [
    `M ${round(source.x)} ${round(source.y)}`,
    `C ${round(sourceControlX)} ${round(source.y)}`,
    `${round(targetControlX)} ${round(target.y)}`,
    `${round(target.x)} ${round(target.y)}`,
  ].join(" ");
}

/**
 * Returns the midpoint (t=0.5) of the cubic bezier curve defined by source/target.
 * Used for positioning edge labels and the delete button affordance.
 */
export function getBezierMidpoint(source: FlowPosition, target: FlowPosition): FlowPosition {
  const deltaX = Math.abs(target.x - source.x);
  const controlOffset = Math.max(48, deltaX * 0.45);
  const p1x = source.x + controlOffset;
  const p2x = target.x - controlOffset;

  // Cubic bezier at t=0.5:
  // B(0.5) = (1/8)P0 + (3/8)P1 + (3/8)P2 + (1/8)P3
  const x = (source.x + 3 * p1x + 3 * p2x + target.x) / 8;
  const y = (source.y + target.y) / 2;

  return { x: round(x), y: round(y) };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
