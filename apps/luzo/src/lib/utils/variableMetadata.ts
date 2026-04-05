import type { VariableSuggestion } from "@/types/pipeline-debug";

const SENSITIVE_VARIABLE_PATTERN =
  /^(password|token|secret|api[_-]?key|bearer|credential|private[_-]?key|access[_-]?key|secret[_-]?key|auth|authorization)$/i;

export function isSensitiveVariableKey(key: string): boolean {
  return SENSITIVE_VARIABLE_PATTERN.test(key.trim());
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
  },
): VariableSuggestion {
  const resolved = input.resolvedValue;
  const stringValue = resolved === undefined ? undefined : stringifyVariableValue(resolved);
  const isSensitive = isSensitiveVariableKey(input.path.split(".").at(-1) ?? input.path);

  return {
    ...input,
    isSensitive,
    resolvedValue: stringValue,
    displayValue:
      stringValue == null ? undefined : isSensitive ? maskVariableValue(stringValue) : stringValue,
  };
}

export function buildEnvironmentVariableSuggestions(
  envVars: Record<string, string>,
): VariableSuggestion[] {
  return Object.keys(envVars).map((key) =>
    createVariableSuggestion({
      path: key,
      label: `env: ${key}`,
      resolvedValue: envVars[key],
      stepId: "",
      type: "env",
    }),
  );
}
