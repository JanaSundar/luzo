import { resolveNodeCollisions } from "@luzo/flow-builder";

import { toFlowNode } from "../nodeAdapters";
import type { FlowBlock } from "./types";

const INSERTION_COLLISION_MARGIN = 16;
const INSERTION_COLLISION_MAX_ITERATIONS = 40;

export function placeBlockWithCollisionResolution(blocks: FlowBlock[], newBlock: FlowBlock) {
  const collisionChanges = resolveNodeCollisions(
    [...blocks.map((block) => toFlowNode(block)), toFlowNode(newBlock)],
    {
      activeNodeId: newBlock.id,
      margin: INSERTION_COLLISION_MARGIN,
      maxIterations: INSERTION_COLLISION_MAX_ITERATIONS,
    },
  );

  if (collisionChanges.length === 0) {
    return [...blocks, newBlock];
  }

  const positionById = new Map(
    collisionChanges.map((change) => [change.id, change.position] as const),
  );

  return [...blocks, newBlock].map((block) => {
    const nextPosition = positionById.get(block.id);
    if (!nextPosition) return block;

    return {
      ...block,
      position: nextPosition,
    };
  });
}
