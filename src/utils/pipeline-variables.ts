import get from "lodash-es/get";

/**
 * Advanced variable interpolation that supports:
 * 1. Environment variables: {{myVar}}
 * 2. Step response body: {{stepId.response.body.path.to.key}}
 * 3. Step response headers: {{stepId.response.headers.Content-Type}}
 * 4. Step response status: {{stepId.response.status}}
 */
export function interpolatePipelineVariables(
  template: string,
  envVariables: Record<string, string>,
  executionContext: Record<string, unknown>,
): string {
  if (!template) return template;

  const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;

  return template.replace(VARIABLE_REGEX, (match, path) => {
    const trimmedPath = path.trim();

    // 1. Check execution context first (step references)
    // path looks like "step-id.response.body.data.id"
    const contextValue = get(executionContext, trimmedPath);
    if (contextValue !== undefined) {
      return String(contextValue);
    }

    // 2. Fallback to basic environment variables
    const envValue = envVariables[trimmedPath];
    if (envValue !== undefined) {
      return envValue;
    }

    return match;
  });
}
