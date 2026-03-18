const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;

/**
 * Safely traverse an object by a dot-separated path.
 * Supports array indexing: "data.users[0].name" or "data.users.0.name"
 */
function getByPath(obj: unknown, path: string): unknown {
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
 * Resolution order: runtimeVariables → envVariables → unresolved (kept as-is).
 */
export function resolveTemplate(
  template: string,
  runtimeVariables: Record<string, unknown>,
  envVariables: Record<string, string> = {}
): string {
  if (!template) return template;

  return template.replace(VARIABLE_REGEX, (match, rawPath: string) => {
    const path = rawPath.trim();

    const runtimeValue = getByPath(runtimeVariables, path);
    if (runtimeValue !== undefined) {
      return typeof runtimeValue === "object" ? JSON.stringify(runtimeValue) : String(runtimeValue);
    }

    const envValue = envVariables[path];
    if (envValue !== undefined) return envValue;

    return match;
  });
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

/**
 * Flatten a nested object into dot-separated paths with their values.
 * Supports array access. Limits depth for safety.
 */
export function flattenObject(
  obj: unknown,
  prefix = "",
  maxDepth = 5,
  depth = 0
): Array<{ path: string; value: unknown }> {
  const results: Array<{ path: string; value: unknown }> = [];

  if (depth >= maxDepth || obj == null) return results;

  if (Array.isArray(obj)) {
    results.push({ path: prefix, value: `Array(${obj.length})` });
    if (obj.length > 0 && typeof obj[0] === "object" && obj[0] !== null) {
      const nested = flattenObject(obj[0], `${prefix}[0]`, maxDepth, depth + 1);
      results.push(...nested);
    }
    return results;
  }

  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      results.push({ path: fullPath, value });

      if (typeof value === "object" && value !== null) {
        const nested = flattenObject(value, fullPath, maxDepth, depth + 1);
        results.push(...nested);
      }
    }
  }

  return results;
}
