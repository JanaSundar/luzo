import {
  validateBodySize,
  validateJsonBody,
  validateParams,
  validateScript,
  validateUrl,
} from "@/utils/security";
import { interpolateVariables } from "@/utils/variables";
import type { ApiRequest, ApiResponse } from "@/types";
import type { RequestContext, ResponseContext } from "./client";
import { buildRequestConfig, type HttpRequestConfig } from "./request-config";
import { runPostRequestScript, runPreRequestScript, runTestScript } from "./scripts";

export interface ScriptRunResult {
  durationMs: number;
  error: string | null;
  logs: string[];
}

export interface TestRunResult extends ScriptRunResult {
  testResults: Array<{ name: string; passed: boolean; error?: string }>;
}

export interface ExecutionOptions {
  abortSignal?: AbortSignal;
  postRequestScript?: string;
  preRequestScript?: string;
  testScript?: string;
}

export interface PreparedExecutionContext {
  config: HttpRequestConfig;
  finalUrl: string;
  mutatedEnv: Record<string, string>;
  preRequestResult?: ScriptRunResult;
}

export function validateExecutionRequest(request: ApiRequest, options?: ExecutionOptions) {
  const checks = [
    () => validateParams(request.params),
    () => validateScript(options?.preRequestScript ?? ""),
    () => validateScript(options?.postRequestScript ?? ""),
    () => validateScript(options?.testScript ?? ""),
    () => validateBodySize(request.body, request.bodyType),
    () => validateJsonBody(request.body, request.bodyType),
  ];

  for (const check of checks) {
    const result = check();
    if (!result.valid) throw new Error(result.error);
  }
}

export function buildPreparedExecutionContext(
  request: ApiRequest,
  envVariables: Record<string, string>,
  options?: ExecutionOptions,
): PreparedExecutionContext {
  validateExecutionRequest(request, options);

  const queryParams = request.params
    .filter((param) => param.enabled && param.key)
    .map(
      (param) =>
        `${encodeURIComponent(interpolateVariables(param.key, envVariables))}=${encodeURIComponent(interpolateVariables(param.value, envVariables))}`,
    )
    .join("&");
  const url = interpolateVariables(request.url, envVariables);
  const fullUrl = queryParams ? `${url}?${queryParams}` : url;
  const urlValidation = validateUrl(fullUrl);
  if (!urlValidation.valid) throw new Error(urlValidation.error);

  let config = buildRequestConfig(request, envVariables, fullUrl);
  let mutatedEnv = { ...envVariables };
  let preRequestResult: ScriptRunResult | undefined;

  if (options?.preRequestScript?.trim()) {
    const startedAt = Date.now();
    const result = runPreRequestScript(options.preRequestScript, {
      request,
      config,
      envVariables: mutatedEnv,
    } satisfies RequestContext);
    config = result.config;
    mutatedEnv = result.envVariables;
    preRequestResult = {
      durationMs: Date.now() - startedAt,
      error: result.result.error,
      logs: result.result.logs,
    };
  }

  return {
    config,
    finalUrl: config.url ?? fullUrl,
    mutatedEnv,
    preRequestResult,
  };
}

export function applyResponseScripts(
  request: ApiRequest,
  response: ApiResponse,
  envVariables: Record<string, string>,
  options?: ExecutionOptions,
) {
  let mutatedEnv = { ...envVariables };
  let finalResponse = response;
  let postRequestResult: ScriptRunResult | undefined;
  let testResult: TestRunResult | undefined;

  if (options?.postRequestScript?.trim()) {
    const startedAt = Date.now();
    const result = runPostRequestScript(options.postRequestScript, {
      request,
      response: finalResponse,
      envVariables: mutatedEnv,
    } satisfies ResponseContext);
    finalResponse = result.response;
    mutatedEnv = result.envVariables;
    postRequestResult = {
      durationMs: Date.now() - startedAt,
      error: result.result.error,
      logs: result.result.logs,
    };
  }

  if (options?.testScript?.trim()) {
    const startedAt = Date.now();
    const result = runTestScript(options.testScript, {
      request,
      response: finalResponse,
      envVariables: mutatedEnv,
    } satisfies ResponseContext);
    testResult = {
      durationMs: Date.now() - startedAt,
      error: result.execution.error,
      logs: result.execution.logs,
      testResults: result.testResults,
    };
  }

  return { finalResponse, mutatedEnv, postRequestResult, testResult };
}
