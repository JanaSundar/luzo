export const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;
/** Variant that trims whitespace inside braces: {{ myVar }} → "myVar" */
export const VARIABLE_REGEX_TRIM = /\{\{\s*([^}]+?)\s*\}\}/g;

export function interpolateVariables(template: string, variables: Record<string, string>): string {
  return template.replace(new RegExp(VARIABLE_REGEX.source, "g"), (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

export function extractVariables(template: string): string[] {
  const matches = [...template.matchAll(new RegExp(VARIABLE_REGEX.source, "g"))];
  return [...new Set(matches.map((m) => m[1]).filter((v): v is string => v !== undefined))];
}

export function hasUnresolvedVariables(
  template: string,
  variables: Record<string, string>,
): boolean {
  const needed = extractVariables(template);
  return needed.some((key) => !(key in variables));
}
