import type { FlowBlock } from "../domain/types";

const DUPLICATE_BLOCK_OFFSET = { x: 48, y: 48 };

export function duplicateFlowBlock(block: Exclude<FlowBlock, { type: "start" }>): FlowBlock {
  const duplicate = structuredClone(block) as FlowBlock;
  duplicate.id = crypto.randomUUID();
  duplicate.position = {
    x: block.position.x + DUPLICATE_BLOCK_OFFSET.x,
    y: block.position.y + DUPLICATE_BLOCK_OFFSET.y,
  };

  if (duplicate.type === "request") {
    duplicate.data.name = withCopySuffix(duplicate.data.name);
    return duplicate;
  }

  if ("label" in duplicate.data && typeof duplicate.data.label === "string") {
    duplicate.data.label = withCopySuffix(duplicate.data.label);
  }

  return duplicate;
}

function withCopySuffix(value: string) {
  return value.endsWith(" (Copy)") ? value : `${value} (Copy)`;
}
