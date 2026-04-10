import { cloneBitset, createEmptyBitset, setBit } from "./bitset";

interface BitsetIndexShape {
  readonly nodeIdByIndex: readonly string[];
  readonly nodeIndexById: ReadonlyMap<string, number>;
  readonly routeById: ReadonlyMap<string, { readonly targetNodeId: string }>;
  readonly descendantBitsetByNode?: ReadonlyMap<string, Uint32Array>;
}

export function createNodeMembershipBitset(
  nodeIds: Iterable<string>,
  index: Pick<BitsetIndexShape, "nodeIdByIndex" | "nodeIndexById">,
) {
  const bitset = createEmptyBitset(index.nodeIdByIndex.length);
  for (const nodeId of nodeIds) setBit(bitset, index.nodeIndexById.get(nodeId));
  return bitset;
}

export function getRouteScopeBitset(routeId: string, index: BitsetIndexShape) {
  const route = index.routeById.get(routeId);
  if (!route) return createEmptyBitset(index.nodeIdByIndex.length);
  const scope = cloneBitset(
    index.descendantBitsetByNode?.get(route.targetNodeId),
    index.nodeIdByIndex.length,
  );
  setBit(scope, index.nodeIndexById.get(route.targetNodeId));
  return scope;
}

export function bitsetToNodeIds(
  bitset: Uint32Array,
  index: Pick<BitsetIndexShape, "nodeIdByIndex">,
) {
  const nodeIds: string[] = [];
  for (let wordIndex = 0; wordIndex < bitset.length; wordIndex++) {
    let word = bitset[wordIndex] ?? 0;
    while (word !== 0) {
      const bit = Math.clz32(word & -word) ^ 31;
      const nodeIndex = wordIndex * 32 + bit;
      const nodeId = index.nodeIdByIndex[nodeIndex];
      if (nodeId) nodeIds.push(nodeId);
      word &= word - 1;
    }
  }
  return nodeIds;
}

export function intersectBitsets(left: Uint32Array, right: Uint32Array) {
  return combineBitsets(left, right, (leftWord, rightWord) => leftWord & rightWord);
}

export function subtractBitsets(left: Uint32Array, right: Uint32Array) {
  return combineBitsets(left, right, (leftWord, rightWord) => leftWord & ~rightWord, left.length);
}

export function hasAnyBit(bitset: Uint32Array) {
  return bitset.some((word) => word !== 0);
}

export function hasBit(bitset: Uint32Array, index: number | undefined) {
  if (index == null || index < 0) return false;
  return ((bitset[index >>> 5] ?? 0) & (1 << (index & 31))) !== 0;
}

function combineBitsets(
  left: Uint32Array,
  right: Uint32Array,
  combine: (leftWord: number, rightWord: number) => number,
  size = Math.max(left.length, right.length),
) {
  const next = new Uint32Array(size);
  for (let i = 0; i < size; i++) next[i] = combine(left[i] ?? 0, right[i] ?? 0);
  return next;
}
