import type { EnvironmentVariable } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

const SENSITIVE_VARIABLE_PATTERN =
  /(?:^|[_-])(password|token|secret|api[_-]?key|credential|private[_-]?key|access[_-]?key|secret[_-]?key)(?:[_-]|$)/i;
const STRICT_SENSITIVE_VARIABLE_PATTERN = /^(bearer|auth|authorization)$/i;

export function isSensitiveVariableKey(key: string): boolean {
  const normalizedKey = key.trim();
  return (
    SENSITIVE_VARIABLE_PATTERN.test(normalizedKey) ||
    STRICT_SENSITIVE_VARIABLE_PATTERN.test(normalizedKey)
  );
}

export function stringifyVariableValue(value: unknown): string {
  if (value == null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function maskVariableValue(value: string): string {
  if (!value) return "••••••";
  if (value.length <= 4) return "••••••";
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}

export function createVariableSuggestion(
  input: Omit<VariableSuggestion, "isSensitive" | "resolvedValue" | "displayValue"> & {
    resolvedValue?: unknown;
    isSensitive?: boolean;
  },
): VariableSuggestion {
  const resolved = input.resolvedValue;
  const stringValue = resolved === undefined ? undefined : stringifyVariableValue(resolved);
  const isSensitive =
    input.isSensitive ?? isSensitiveVariableKey(input.path.split(".").at(-1) ?? input.path);

  return {
    ...input,
    isSensitive,
    resolvedValue: stringValue,
    displayValue:
      stringValue == null ? undefined : isSensitive ? maskVariableValue(stringValue) : stringValue,
  };
}

export function buildEnvironmentVariableSuggestions(
  variables: EnvironmentVariable[],
): VariableSuggestion[] {
  return variables.map((v) =>
    createVariableSuggestion({
      path: v.key,
      label: `env: ${v.key}`,
      resolvedValue: v.value,
      isSensitive: v.secret,
      stepId: "",
      type: "env",
    }),
  );
}
