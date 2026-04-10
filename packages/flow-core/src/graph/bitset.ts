export function createEmptyBitset(size: number) {
  return new Uint32Array(Math.max(1, Math.ceil(size / 32)));
}

export function cloneBitset(bitset: Uint32Array | undefined, size: number) {
  const clone = createEmptyBitset(size);
  if (bitset) clone.set(bitset);
  return clone;
}

export function setBit(bitset: Uint32Array, index: number | undefined) {
  if (index == null || index < 0) return;
  bitset[index >>> 5] = bitset[index >>> 5]! | (1 << (index & 31));
}

export function orInto(target: Uint32Array, source?: Uint32Array) {
  if (!source) return;
  for (let i = 0; i < target.length; i++) target[i] = target[i]! | (source[i] ?? 0);
}
