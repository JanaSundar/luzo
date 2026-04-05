import type { BlockDefinition, BlockRegistry } from "@luzo/flow-types";

export function createBlockRegistry(definitions: BlockDefinition[]): BlockRegistry {
  return Object.fromEntries(definitions.map((definition) => [definition.type, definition]));
}
