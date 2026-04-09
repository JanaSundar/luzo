import type { ConditionRule } from "@/types";
import type { ConditionNodeConfig } from "@/types/workflow";
import { getByPath } from "./variable-resolver";

const JS_IDENTIFIER_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

export interface ConditionEvalResult {
  result: boolean;
  resolvedInputs: Record<string, unknown>;
}

/**
 * Evaluates a condition node's rules against the current runtime variables and env.
 *
 * Simple mode: all rules must pass (AND). Returns true path if every rule matches.
 * Expression mode: when no rules are configured, evaluates config.expression.
 *
 * Complexity: O(k) where k = number of rules. Bounded and runs on the main thread.
 */
export function evaluateConditionStep(
  config: ConditionNodeConfig,
  runtimeVariables: Record<string, unknown>,
  envVariables: Record<string, string> = {},
): ConditionEvalResult {
  const resolvedInputs: Record<string, unknown> = {};

  const rules = config.rules ?? [];
  if (rules.length === 0) {
    if (config.expression?.trim()) {
      return {
        result: evaluateExpression(config.expression, runtimeVariables, envVariables),
        resolvedInputs,
      };
    }
    return { result: false, resolvedInputs };
  }

  const result = rules.every((rule) => {
    const value = resolveRuleValue(rule.valueRef, runtimeVariables, envVariables);
    resolvedInputs[rule.valueRef] = value;
    return applyOperator(rule, value);
  });

  return { result, resolvedInputs };
}

function evaluateExpression(
  expression: string,
  runtimeVariables: Record<string, unknown>,
  envVariables: Record<string, string>,
): boolean {
  try {
    const vars: Record<string, unknown> = { ...runtimeVariables, env: envVariables };
    const { normalizedExpression, normalizedVars } = normalizeExpressionScope(expression, vars);
    const safeKeys = Object.keys(normalizedVars).filter(isJavaScriptIdentifier);
    const safeValues = safeKeys.map((k) => normalizedVars[k]);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...safeKeys, `"use strict"; return !!(${normalizedExpression});`);
    return Boolean(fn(...safeValues));
  } catch {
    return false;
  }
}

function normalizeExpressionScope(
  expression: string,
  vars: Record<string, unknown>,
): { normalizedExpression: string; normalizedVars: Record<string, unknown> } {
  const normalizedVars: Record<string, unknown> = { ...vars };
  let normalizedExpression = expression;
  let aliasIndex = 0;

  for (const [key, value] of Object.entries(vars)) {
    if (isJavaScriptIdentifier(key)) continue;

    const alias = `__expr_var_${aliasIndex++}`;
    normalizedVars[alias] = value;
    normalizedExpression = replaceInvalidRootReference(normalizedExpression, key, alias);
  }

  return { normalizedExpression, normalizedVars };
}

function replaceInvalidRootReference(expression: string, key: string, alias: string) {
  const escaped = escapeRegExp(key);
  const pattern = new RegExp(`(^|[^A-Za-z0-9_$"'])(${escaped})(?=\\s*(?:\\.|\\[))`, "g");
  return expression.replace(pattern, `$1${alias}`);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

function isJavaScriptIdentifier(value: string) {
  return JS_IDENTIFIER_REGEX.test(value);
}

function resolveRuleValue(
  valueRef: string,
  runtimeVariables: Record<string, unknown>,
  envVariables: Record<string, string>,
): unknown {
  // "env.KEY" → look up in envVariables
  if (valueRef.startsWith("env.")) {
    const key = valueRef.slice(4);
    return envVariables[key];
  }
  return getByPath(runtimeVariables, valueRef);
}

function applyOperator(rule: ConditionRule, left: unknown): boolean {
  switch (rule.operator) {
    case "exists":
      return left != null;
    case "not_exists":
      return left == null;
    case "greater_than":
      return Number(left) > Number(rule.value ?? 0);
    case "less_than":
      return Number(left) < Number(rule.value ?? 0);
    case "contains":
      return String(left ?? "").includes(rule.value ?? "");
    case "not_contains":
      return !String(left ?? "").includes(rule.value ?? "");
    case "not_equals":
      return String(left ?? "") !== String(rule.value ?? "");
    case "equals":
    default:
      return String(left ?? "") === String(rule.value ?? "");
  }
}
