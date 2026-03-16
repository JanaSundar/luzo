import { createContext, runInContext } from "node:vm";
import * as chai from "chai";
import * as _ from "lodash-es";
import { LIMITS, validateScript } from "@/lib/utils/security";
import type { HttpRequestConfig, RequestContext, ResponseContext } from "./client";

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const SCRIPT_TIMEOUT_MS = 3000;

/**
 * Run pre-request script (Postman/Requestly style).
 * Exposes pm.request, pm.env for modifying request before send.
 */
export function runPreRequestScript(
  script: string,
  ctx: RequestContext
): { config: HttpRequestConfig; envVariables: Record<string, string> } {
  const result = validateScript(script);
  if (!result.valid) {
    throw new Error(result.error);
  }
  if (script.length > LIMITS.MAX_SCRIPT_LENGTH) {
    throw new Error(`Script exceeds maximum length of ${LIMITS.MAX_SCRIPT_LENGTH / 1024}KB`);
  }

  const envVariables = { ...ctx.envVariables };
  let config = { ...ctx.config };

  const headers: Record<string, string> = { ...(config.headers as Record<string, string>) };
  const pm = {
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
    pm,
    console: { log: (..._args: unknown[]) => {} },
  };

  try {
    const scriptObj = createContext(sandbox);
    runInContext(`(function() { "use strict"; ${script} })();`, scriptObj, {
      timeout: SCRIPT_TIMEOUT_MS,
    });
  } catch (err: unknown) {
    console.error("[Pre-request script error]", err);
  }

  return { config: { ...config, headers }, envVariables };
}

/**
 * Run test script (Postman/Requestly style).
 * Exposes pm.response, pm.test for assertions.
 */
export function runTestScript(script: string, ctx: ResponseContext): TestResult[] {
  const results: TestResult[] = [];

  const pm = {
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
        results.push({ name, passed: true });
      } catch (err: unknown) {
        results.push({
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
    console: { log: (..._args: unknown[]) => {} },
  };

  const sandbox = {
    pm,
    _,
    expect: chai.expect,
    console: { log: (..._args: unknown[]) => {} },
  };

  const scriptResult = validateScript(script);
  if (!scriptResult.valid) {
    results.push({ name: "Script validation", passed: false, error: scriptResult.error });
    return results;
  }
  if (script.length > LIMITS.MAX_SCRIPT_LENGTH) {
    results.push({
      name: "Script validation",
      passed: false,
      error: `Script exceeds maximum length of ${LIMITS.MAX_SCRIPT_LENGTH / 1024}KB`,
    });
    return results;
  }

  try {
    const scriptObj = createContext(sandbox);
    runInContext(`(function() { "use strict"; ${script} })();`, scriptObj, {
      timeout: SCRIPT_TIMEOUT_MS,
    });
  } catch (err: unknown) {
    results.push({
      name: "Script execution",
      passed: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return results;
}
