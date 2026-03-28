import * as chai from "chai";
import * as _ from "lodash-es";
import type { RequestContext, ResponseContext } from "./client";
import type { HttpRequestConfig } from "./request-config";
import {
  createCapturingConsole,
  createHeaderBag,
  createMutableEnvApi,
  executeScript,
  stringifyScriptValue,
  type ScriptExecutionResult,
  validateExecutableScript,
} from "./script-helpers";

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export function runPreRequestScript(
  script: string,
  ctx: RequestContext,
): {
  config: HttpRequestConfig;
  envVariables: Record<string, string>;
  result: ScriptExecutionResult;
} {
  const result: ScriptExecutionResult = { logs: [], error: null };
  const validation = validateExecutableScript(script);
  if (!validation.valid) {
    result.error = validation.error;
    return { config: ctx.config, envVariables: ctx.envVariables, result };
  }

  const envVariables = { ...ctx.envVariables };
  let config = { ...ctx.config };
  const headers: Record<string, string> = { ...(config.headers as Record<string, string>) };
  const capturingConsole = createCapturingConsole();
  const envApi = createMutableEnvApi(envVariables);
  const headerBag = createHeaderBag(headers, {
    remove: (key) => {
      delete headers[key];
    },
    set: (key, value) => {
      headers[key] = value;
    },
  });

  const lz = {
    request: {
      get url() {
        return config.url ?? "";
      },
      set url(v: string) {
        config = { ...config, url: v };
      },
      headers: headerBag,
      get body() {
        return config.data;
      },
      set body(v: unknown) {
        config = { ...config, data: v };
      },
    },
    env: envApi,
    variables: envApi,
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

export function runPostRequestScript(
  script: string,
  ctx: ResponseContext,
): {
  response: ResponseContext["response"];
  envVariables: Record<string, string>;
  result: ScriptExecutionResult;
} {
  const result: ScriptExecutionResult = { logs: [], error: null };
  const validation = validateExecutableScript(script);
  if (!validation.valid) {
    result.error = validation.error;
    return { response: ctx.response, envVariables: ctx.envVariables, result };
  }

  const envVariables = { ...ctx.envVariables };
  const response = {
    ...ctx.response,
    headers: { ...ctx.response.headers },
  };
  const capturingConsole = createCapturingConsole();
  const envApi = createMutableEnvApi(envVariables);
  const responseHeaders = createHeaderBag(response.headers, {
    remove: (key) => {
      delete response.headers[key];
    },
    set: (key, value) => {
      response.headers[key] = value;
    },
  });
  const lz = {
    response: {
      get status() {
        return response.status;
      },
      set status(value: number) {
        response.status = value;
      },
      get statusText() {
        return response.statusText;
      },
      set statusText(value: string) {
        response.statusText = value;
      },
      headers: responseHeaders,
      get body() {
        return response.body;
      },
      set body(value: unknown) {
        response.body = stringifyScriptValue(value);
      },
      get time() {
        return response.time;
      },
      get responseTime() {
        return response.time;
      },
      json() {
        try {
          return JSON.parse(response.body);
        } catch {
          return null;
        }
      },
      text() {
        return response.body;
      },
    },
    env: envApi,
    variables: envApi,
  };

  const execution = executeScript(script, {
    console: capturingConsole.console,
    lz,
    pm: lz,
  });
  result.logs = capturingConsole.getLogs();
  result.error = execution.error;
  return { response, envVariables, result };
}

export function runTestScript(
  script: string,
  ctx: ResponseContext,
): { testResults: TestResult[]; execution: ScriptExecutionResult } {
  const testResults: TestResult[] = [];
  const execution: ScriptExecutionResult = { logs: [], error: null };
  const capturingConsole = createCapturingConsole();
  const envApi = createMutableEnvApi(ctx.envVariables);
  const responseHeaders = createHeaderBag(ctx.response.headers);

  const lz = {
    response: {
      get status() {
        return ctx.response.status;
      },
      get statusText() {
        return ctx.response.statusText;
      },
      headers: responseHeaders,
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
    env: envApi,
    variables: envApi,
  };

  const sandbox = {
    lz,
    pm: lz, // Legacy alias
    _,
    expect: chai.expect,
    console: capturingConsole.console,
  };

  const validation = validateExecutableScript(script);
  if (!validation.valid) {
    execution.error = validation.error;
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
