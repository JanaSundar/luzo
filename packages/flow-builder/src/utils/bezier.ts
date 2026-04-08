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

function round(value: number) {
  return Math.round(value * 100) / 100;
}
