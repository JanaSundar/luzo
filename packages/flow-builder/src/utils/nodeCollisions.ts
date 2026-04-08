import type { FlowNode, FlowPosition, FlowSize } from "@luzo/flow-types";

import { getNodeSize } from "../store/selectors";

interface ResolveNodeCollisionsOptions {
  activeNodeId?: string;
  margin?: number;
  maxIterations?: number;
  nodeSizes?: Record<string, FlowSize>;
}

interface CollisionLayout {
  id: string;
  position: FlowPosition;
  size: FlowSize;
}

const DEFAULT_MARGIN = 16;
const DEFAULT_MAX_ITERATIONS = 40;

export function resolveNodeCollisions(
  nodes: FlowNode[],
  options: ResolveNodeCollisionsOptions = {},
) {
  if (nodes.length < 2) return [];

  const layouts = nodes.map((node) => ({
    id: node.id,
    position: { ...node.position },
    size: getNodeSize(node, options.nodeSizes ?? {}),
  }));
  const positions = new Map(layouts.map((layout) => [layout.id, { ...layout.position }] as const));
  const margin = options.margin ?? DEFAULT_MARGIN;
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let movedInIteration = false;

    for (let index = 0; index < layouts.length; index += 1) {
      const left = layouts[index];
      if (!left) continue;

      for (let otherIndex = index + 1; otherIndex < layouts.length; otherIndex += 1) {
        const right = layouts[otherIndex];
        if (!right) continue;

        const leftPosition = positions.get(left.id) ?? left.position;
        const rightPosition = positions.get(right.id) ?? right.position;
        const overlap = getOverlap(
          { ...left, position: leftPosition },
          { ...right, position: rightPosition },
          margin,
        );

        if (!overlap) continue;
        movedInIteration = true;

        const separateHorizontally = overlap.x < overlap.y;
        const leftIsFixed = left.id === options.activeNodeId;
        const rightIsFixed = right.id === options.activeNodeId;

        if (separateHorizontally) {
          const direction = getDirection(
            leftPosition.x + left.size.width / 2,
            rightPosition.x + right.size.width / 2,
            index,
            otherIndex,
          );

          nudgePair({
            amount: overlap.x,
            axis: "x",
            direction,
            leftId: left.id,
            leftIsFixed,
            positions,
            rightId: right.id,
            rightIsFixed,
          });
        } else {
          const direction = getDirection(
            leftPosition.y + left.size.height / 2,
            rightPosition.y + right.size.height / 2,
            index,
            otherIndex,
          );

          nudgePair({
            amount: overlap.y,
            axis: "y",
            direction,
            leftId: left.id,
            leftIsFixed,
            positions,
            rightId: right.id,
            rightIsFixed,
          });
        }
      }
    }

    if (!movedInIteration) break;
  }

  return nodes.flatMap((node) => {
    const resolved = positions.get(node.id);
    if (!resolved) return [];
    if (resolved.x === node.position.x && resolved.y === node.position.y) return [];

    return [{ id: node.id, position: resolved }];
  });
}

function getOverlap(left: CollisionLayout, right: CollisionLayout, margin: number) {
  const halfMargin = margin / 2;
  const overlapX =
    Math.min(
      left.position.x + left.size.width + halfMargin,
      right.position.x + right.size.width + halfMargin,
    ) - Math.max(left.position.x - halfMargin, right.position.x - halfMargin);
  const overlapY =
    Math.min(
      left.position.y + left.size.height + halfMargin,
      right.position.y + right.size.height + halfMargin,
    ) - Math.max(left.position.y - halfMargin, right.position.y - halfMargin);

  if (overlapX <= 0 || overlapY <= 0) return null;

  return { x: overlapX, y: overlapY };
}

function getDirection(
  leftCenter: number,
  rightCenter: number,
  leftIndex: number,
  rightIndex: number,
) {
  if (leftCenter === rightCenter) {
    return leftIndex < rightIndex ? -1 : 1;
  }

  return leftCenter < rightCenter ? -1 : 1;
}

function nudgePair({
  amount,
  axis,
  direction,
  leftId,
  leftIsFixed,
  positions,
  rightId,
  rightIsFixed,
}: {
  amount: number;
  axis: "x" | "y";
  direction: -1 | 1;
  leftId: string;
  leftIsFixed: boolean;
  positions: Map<string, FlowPosition>;
  rightId: string;
  rightIsFixed: boolean;
}) {
  const left = positions.get(leftId);
  const right = positions.get(rightId);
  if (!left || !right) return;

  if (leftIsFixed && rightIsFixed) {
    right[axis] -= direction * amount;
    return;
  }

  if (leftIsFixed) {
    right[axis] -= direction * amount;
    return;
  }

  if (rightIsFixed) {
    left[axis] += direction * amount;
    return;
  }

  left[axis] += direction * (amount / 2);
  right[axis] -= direction * (amount / 2);
}
