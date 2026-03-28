import { LIMITS, validateScript } from "@/utils/security";

export interface ScriptExecutionResult {
  logs: string[];
  error: string | null;
}

export function createCapturingConsole(): {
  console: { log: (...args: unknown[]) => void };
  getLogs: () => string[];
} {
  const logs: string[] = [];
  return {
    console: {
      log: (...args: unknown[]) => {
        logs.push(
          args
            .map((value) => (typeof value === "object" ? JSON.stringify(value) : String(value)))
            .join(" "),
        );
      },
    },
    getLogs: () => logs,
  };
}

export function executeScript(
  script: string,
  sandbox: Record<string, unknown>,
): { error: string | null } {
  try {
    const keys = Object.keys(sandbox);
    const values = keys.map((key) => sandbox[key]);
    const runner = new Function(...keys, `"use strict";\n${script}`);
    runner(...values);
    return { error: null };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export function validateExecutableScript(script: string) {
  const validation = validateScript(script);
  if (!validation.valid) {
    return { valid: false, error: validation.error ?? "Script validation failed" };
  }
  if (script.length > LIMITS.MAX_SCRIPT_LENGTH) {
    return {
      valid: false,
      error: `Script exceeds maximum length of ${LIMITS.MAX_SCRIPT_LENGTH / 1024}KB`,
    };
  }
  return { valid: true as const, error: null };
}

export function createHeaderBag(
  source: Record<string, string>,
  mutators?: {
    set?: (key: string, value: string) => void;
    remove?: (key: string) => void;
  },
) {
  return new Proxy(source, {
    get(target, prop) {
      if (prop === "get") {
        return (key: string) => target[key];
      }
      if (prop === "has") {
        return (key: string) => key in target;
      }
      if (prop === "upsert" || prop === "add" || prop === "set") {
        return (key: string, value: string) => mutators?.set?.(key, value);
      }
      if (prop === "remove" || prop === "delete") {
        return (key: string) => mutators?.remove?.(key);
      }
      if (prop === "toJSON") {
        return () => ({ ...target });
      }
      if (typeof prop === "string") return target[prop];
      return undefined;
    },
  }) as Record<string, string> & {
    add?: (key: string, value: string) => void;
    get: (key: string) => string | undefined;
    has: (key: string) => boolean;
    remove?: (key: string) => void;
    set?: (key: string, value: string) => void;
    upsert?: (key: string, value: string) => void;
  };
}

export function createMutableEnvApi(envVariables: Record<string, string>) {
  return {
    set(key: string, value: string) {
      envVariables[key] = String(value);
    },
    get(key: string) {
      return envVariables[key] ?? "";
    },
    unset(key: string) {
      delete envVariables[key];
    },
  };
}

export function stringifyScriptValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
}
