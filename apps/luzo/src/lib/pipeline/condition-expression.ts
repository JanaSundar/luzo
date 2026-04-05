import { validateScript } from "@/lib/utils/security";

const CONDITION_BLOCKED_PATTERNS = [
  /\b(?:window|document|localStorage|sessionStorage)\b/,
  /\b(?:fetch|XMLHttpRequest|WebSocket)\b/,
];

export function evaluateConditionExpression(params: {
  expression: string;
  runtimeVariables: Record<string, unknown>;
  envVariables: Record<string, string>;
}) {
  const expression = params.expression.trim();
  if (!expression) {
    return { error: "Condition expression is empty", result: null, resolvedValue: undefined };
  }

  const validation = validateScript(expression);
  if (!validation.valid) {
    return {
      error: validation.error ?? "Condition expression is invalid",
      result: null,
      resolvedValue: undefined,
    };
  }

  for (const pattern of CONDITION_BLOCKED_PATTERNS) {
    if (pattern.test(expression)) {
      return {
        error: "Condition expression contains unsupported browser or network APIs",
        result: null,
        resolvedValue: undefined,
      };
    }
  }

  try {
    const evaluator = new Function(
      "ctx",
      `return (function () { with (ctx) { return (${expression}); } })();`,
    ) as (ctx: Record<string, unknown>) => unknown;

    const resolvedValue = evaluator({
      ...params.runtimeVariables,
      env: params.envVariables,
    });

    return {
      error: null,
      result: Boolean(resolvedValue),
      resolvedValue,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Condition evaluation failed",
      result: null,
      resolvedValue: undefined,
    };
  }
}
