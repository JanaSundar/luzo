import { VARIABLE_REGEX } from "@/utils/variables";
import type { StepAlias } from "@/types/pipeline-debug";

/**
 * Safely traverse an object by a dot-separated path.
 * Supports array indexing: "data.users[0].name" or "data.users.0.name"
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (obj == null) return undefined;

  const segments = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  let current: unknown = obj;

  for (const segment of segments) {
    if (current == null) return undefined;

    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Resolve all {{path}} variables in a template string.
 * Resolution order: variableOverrides → runtimeVariables → envVariables → unresolved (kept as-is).
 */
export function resolveTemplate(
  template: string,
  runtimeVariables: Record<string, unknown>,
  envVariables: Record<string, string> = {},
  variableOverrides: Record<string, string> = {},
): string {
  if (!template) return template;

  const result = template.replace(VARIABLE_REGEX, (match, rawPath: string) => {
    const path = rawPath.trim();

    const overrideValue = variableOverrides[path];
    if (overrideValue !== undefined) return overrideValue;

    const runtimeValue = getByPath(runtimeVariables, path);
    if (runtimeValue !== undefined) {
      return typeof runtimeValue === "object" ? JSON.stringify(runtimeValue) : String(runtimeValue);
    }

    const envValue = envVariables[path];
    if (envValue !== undefined) return envValue;

    return match;
  });

  return result;
}

/**
 * Extract all {{variable}} references from a template.
 */
export function extractVariableRefs(template: string): string[] {
  if (!template) return [];
  const refs: string[] = [];
  for (const match of template.matchAll(VARIABLE_REGEX)) {
    refs.push(match[1].trim());
  }
  return refs;
}

/**
 * Check if a variable path references a specific step by alias.
 * e.g., "req1.response.body.token" → stepAlias = "req1"
 */
export function getStepAliasFromPath(path: string): string | null {
  const dotIndex = path.indexOf(".");
  if (dotIndex === -1) return null;
  const prefix = path.substring(0, dotIndex);
  if (/^req\d+$/.test(prefix)) return prefix;
  return null;
}

export function getStepReferenceFromPath(path: string): string | null {
  const dotIndex = path.indexOf(".");
  if (dotIndex === -1) return null;
  return path.substring(0, dotIndex).trim() || null;
}

export function resolveStepAlias(path: string, aliases: StepAlias[]): StepAlias | null {
  const reference = getStepReferenceFromPath(path);
  if (!reference) return null;
  return aliases.find((alias) => alias.refs.includes(reference)) ?? null;
}

/**
 * Flatten a nested object into dot-separated paths with their values.
 * Now iterative to avoid stack depth issues and improved performance.
 */
export function flattenObject(
  obj: unknown,
  prefix = "",
  maxDepth = 5,
): Array<{ path: string; value: unknown }> {
  const results: Array<{ path: string; value: unknown }> = [];
  if (obj == null) return results;

  const stack: Array<{ val: unknown; pref: string; d: number }> = [
    { val: obj, pref: prefix, d: 0 },
  ];

  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) continue;
    const { val, pref, d } = entry;

    if (d >= maxDepth || val == null) continue;

    if (Array.isArray(val)) {
      results.push({ path: pref, value: `Array(${val.length})` });
      if (val.length > 0 && typeof val[0] === "object" && val[0] !== null) {
        stack.push({ val: val[0], pref: `${pref}[0]`, d: d + 1 });
      }
    } else if (typeof val === "object") {
      const entries = Object.entries(val as Record<string, unknown>);
      // Push in reverse to maintain original object key order in results
      for (let i = entries.length - 1; i >= 0; i--) {
        const [key, v] = entries[i];
        const fullPath = pref ? `${pref}.${key}` : key;
        results.push({ path: fullPath, value: v });

        if (typeof v === "object" && v !== null) {
          stack.push({ val: v, pref: fullPath, d: d + 1 });
        }
      }
    }
  }

  return results;
}
