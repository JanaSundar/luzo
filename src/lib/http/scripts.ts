import * as chai from "chai";
import * as _ from "lodash-es";
import { LIMITS, validateScript } from "@/lib/utils/security";
import type { HttpRequestConfig, RequestContext, ResponseContext } from "./client";

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface ScriptExecutionResult {
  logs: string[];
  error: string | null;
}

/**
 * Capture console.log output from scripts
 */
function createCapturingConsole(): {
  console: { log: (...args: unknown[]) => void };
  getLogs: () => string[];
} {
  const logs: string[] = [];
  return {
    console: {
      log: (...args: unknown[]) => {
        logs.push(
          args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
        );
      },
    },
    getLogs: () => logs,
  };
}

function executeScript(script: string, sandbox: Record<string, unknown>): { error: string | null } {
  try {
    const keys = Object.keys(sandbox);
    const values = keys.map((key) => sandbox[key]);
    const runner = new Function(...keys, `"use strict";\n${script}`);
    runner(...values);
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Run pre-request script (Luzo-style).
 * Exposes lz.request, lz.env for modifying request before send.
 */
export function runPreRequestScript(
  script: string,
  ctx: RequestContext,
): {
  config: HttpRequestConfig;
  envVariables: Record<string, string>;
  result: ScriptExecutionResult;
} {
  const result: ScriptExecutionResult = { logs: [], error: null };

  const resultValidate = validateScript(script);
  if (!resultValidate.valid) {
    result.error = resultValidate.error ?? "Script validation failed";
    return { config: ctx.config, envVariables: ctx.envVariables, result };
  }
  if (script.length > LIMITS.MAX_SCRIPT_LENGTH) {
    result.error = `Script exceeds maximum length of ${LIMITS.MAX_SCRIPT_LENGTH / 1024}KB`;
    return { config: ctx.config, envVariables: ctx.envVariables, result };
  }

  const envVariables = { ...ctx.envVariables };
  let config = { ...ctx.config };

  const headers: Record<string, string> = { ...(config.headers as Record<string, string>) };
  const capturingConsole = createCapturingConsole();

  const lz = {
    request: {
      get url() {
        return config.url ?? "";
      },
      set url(v: string) {
        config = { ...config, url: v };
      },
      headers: {
        upsert(key: string, value: string) {
          headers[key] = value;
        },
        add(key: string, value: string) {
          headers[key] = value;
        },
      },
      get body() {
        return config.data;
      },
      set body(v: unknown) {
        config = { ...config, data: v };
      },
    },
    env: {
      set(key: string, value: string) {
        envVariables[key] = String(value);
      },
      get(key: string) {
        return envVariables[key] ?? "";
      },
    },
    variables: {
      set(key: string, value: string) {
        envVariables[key] = String(value);
      },
      get(key: string) {
        return envVariables[key] ?? "";
      },
    },
  };

  const sandbox = {
    lz,
    pm: lz, // Legacy alias
    console: capturingConsole.console,
  };

  const execution = executeScript(script, sandbox);
  result.logs = capturingConsole.getLogs();
  result.error = execution.error;

  return { config: { ...config, headers }, envVariables, result };
}

/**
 * Run test script (Luzo-style).
 * Exposes lz.response, lz.test for assertions.
 */
export function runTestScript(
  script: string,
  ctx: ResponseContext,
): { testResults: TestResult[]; execution: ScriptExecutionResult } {
  const testResults: TestResult[] = [];
  const execution: ScriptExecutionResult = { logs: [], error: null };

  const capturingConsole = createCapturingConsole();

  const lz = {
    response: {
      get status() {
        return ctx.response.status;
      },
      get statusText() {
        return ctx.response.statusText;
      },
      get headers() {
        return ctx.response.headers;
      },
      get body() {
        return ctx.response.body;
      },
      get time() {
        return ctx.response.time;
      },
      get responseTime() {
        return ctx.response.time;
      },
      json() {
        try {
          return JSON.parse(ctx.response.body);
        } catch {
          return null;
        }
      },
      text() {
        return ctx.response.body;
      },
    },
    test: (name: string, fn: () => void) => {
      try {
        fn();
        testResults.push({ name, passed: true });
      } catch (err: unknown) {
        testResults.push({
          name,
          passed: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    expect: chai.expect,
    env: {
      set(key: string, value: string) {
        ctx.envVariables[key] = String(value);
      },
      get(key: string) {
        return ctx.envVariables[key] ?? "";
      },
    },
  };

  const sandbox = {
    lz,
    pm: lz, // Legacy alias
    _,
    expect: chai.expect,
    console: capturingConsole.console,
  };

  const scriptValidate = validateScript(script);
  if (!scriptValidate.valid) {
    execution.error = scriptValidate.error ?? "Script validation failed";
    testResults.push({ name: "Script validation", passed: false, error: execution.error });
    return { testResults, execution };
  }
  if (script.length > LIMITS.MAX_SCRIPT_LENGTH) {
    execution.error = `Script exceeds maximum length of ${LIMITS.MAX_SCRIPT_LENGTH / 1024}KB`;
    testResults.push({ name: "Script validation", passed: false, error: execution.error });
    return { testResults, execution };
  }

  const result = executeScript(script, sandbox);
  execution.logs = capturingConsole.getLogs();
  execution.error = result.error;
  if (execution.error) {
    testResults.push({
      name: "Script execution",
      passed: false,
      error: execution.error,
    });
  }

  return { testResults, execution };
}
