const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;

export function interpolateVariables(template: string, variables: Record<string, string>): string {
  return template.replace(VARIABLE_REGEX, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

export function extractVariables(template: string): string[] {
  const matches = [...template.matchAll(VARIABLE_REGEX)];
  return [...new Set(matches.map((m) => m[1]).filter((value): value is string => Boolean(value)))];
}

export function hasUnresolvedVariables(
  template: string,
  variables: Record<string, string>,
): boolean {
  const needed = extractVariables(template);
  return needed.some((key) => !(key in variables));
}
