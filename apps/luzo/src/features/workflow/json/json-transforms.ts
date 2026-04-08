import { create } from "jsondiffpatch";

export interface JsonDiffInput {
  previous: unknown;
  next: unknown;
}

export interface JsonDiffOutput {
  changedPaths: string[];
  changeCount: number;
  delta: unknown;
}

export interface LargePayloadTransformInput {
  value: unknown;
  maxDepth?: number;
  maxEntries?: number;
}

export interface LargePayloadTransformOutput {
  value: unknown;
  truncated: boolean;
}

interface TruncateResult {
  truncated: boolean;
  value: unknown;
}

const differ = create({
  arrays: { detectMove: false, includeValueOnMove: false },
  cloneDiffValues: false,
});

export function diffJsonPayloads(input: JsonDiffInput): JsonDiffOutput {
  const delta = differ.diff(input.previous, input.next) ?? null;
  const changedPaths = collectChangedPaths(delta);
  return { changedPaths, changeCount: changedPaths.length, delta };
}

export function transformLargePayload(
  input: LargePayloadTransformInput,
): LargePayloadTransformOutput {
  const { value, truncated } = truncateValue(
    input.value,
    input.maxDepth ?? 6,
    input.maxEntries ?? 250,
  );
  return { value, truncated };
}

function collectChangedPaths(delta: unknown, path = "$"): string[] {
  if (delta == null) return [];
  if (!Array.isArray(delta) && typeof delta !== "object") return [path];
  if (Array.isArray(delta)) return [path];

  return Object.entries(delta as Record<string, unknown>).flatMap(([key, value]) => {
    if (key === "_t") return [];
    const nextPath = path === "$" ? `$.${key}` : `${path}.${key}`;
    return collectChangedPaths(value, nextPath);
  });
}

function truncateValue(
  value: unknown,
  maxDepth: number,
  maxEntries: number,
  depth = 0,
): TruncateResult {
  if (depth >= maxDepth) {
    return { value: "[truncated]", truncated: true };
  }
  if (Array.isArray(value)) {
    let truncated = value.length > maxEntries;
    const next = value.slice(0, maxEntries).map((entry) => {
      const result = truncateValue(entry, maxDepth, maxEntries, depth + 1);
      truncated ||= result.truncated;
      return result.value;
    });
    return { value: next, truncated };
  }
  if (value && typeof value === "object") {
    let truncated = Object.keys(value).length > maxEntries;
    const next = Object.fromEntries(
      Object.entries(value)
        .slice(0, maxEntries)
        .map(([key, entry]) => {
          const result = truncateValue(entry, maxDepth, maxEntries, depth + 1);
          truncated ||= result.truncated;
          return [key, result.value];
        }),
    );
    return { value: next, truncated };
  }
  return { value, truncated: false };
}
