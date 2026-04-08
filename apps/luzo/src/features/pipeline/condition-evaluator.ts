import type { ConditionRule } from "@/types";
import type { ConditionNodeConfig } from "@/types/workflow";
import { getByPath } from "./variable-resolver";

export interface ConditionEvalResult {
  result: boolean;
  resolvedInputs: Record<string, unknown>;
}

/**
 * Evaluates a condition node's rules against the current runtime variables and env.
 *
 * Simple mode: all rules must pass (AND). Returns true path if every rule matches.
 * Advanced mode (expression): not yet evaluated in Phase 1 — defaults to false with
 * a warning; gated by compiler validation before runtime reaches this.
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
    // Advanced mode is not yet evaluated in Phase 1.
    // Compiler rejects empty rules + empty expression, so this path means expression-only.
    return { result: false, resolvedInputs };
  }

  const result = rules.every((rule) => {
    const value = resolveRuleValue(rule.valueRef, runtimeVariables, envVariables);
    resolvedInputs[rule.valueRef] = value;
    return applyOperator(rule, value);
  });

  return { result, resolvedInputs };
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
