import { processResponseBody } from "@/lib/utils/response-processor";
import {
  sanitizeHeader,
  sanitizeHeaders,
  validateBodySize,
  validateHeaders,
  validateParams,
  validateScript,
  validateUrl,
} from "@/lib/utils/security";
import { interpolateVariables } from "@/lib/utils/variables";
import type { ApiRequest, ApiResponse } from "@/types";
import { runPreRequestScript, runTestScript } from "./scripts";

export type RequestContext = {
  request: ApiRequest;
  config: HttpRequestConfig;
  envVariables: Record<string, string>;
};

export type ResponseContext = {
  request: ApiRequest;
  response: ApiResponse;
  envVariables: Record<string, string>;
};

export interface HttpRequestConfig {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  data?: unknown;
}

/**
 * Build request config from ApiRequest (for non-form-data).
 */
export function buildRequestConfig(
  request: ApiRequest,
  envVariables: Record<string, string>,
  fullUrl: string,
): HttpRequestConfig {
  const headers: Record<string, string> = {};

  for (const h of request.headers.filter((h) => h.enabled && h.key)) {
    const key = interpolateVariables(h.key, envVariables);
    const value = interpolateVariables(h.value, envVariables);
    const { valid } = sanitizeHeader(key, value);
    if (valid) headers[key] = value;
  }

  const hasContentType = Object.keys(headers).some((k) => k.toLowerCase() === "content-type");
  if (!hasContentType && request.body && request.method !== "GET") {
    if (request.bodyType === "json") headers["Content-Type"] = "application/json";
    else if (request.bodyType === "x-www-form-urlencoded")
      headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  applyAuth(request, headers, envVariables);

  return {
    method: request.method,
    url: fullUrl,
    headers,
    data:
      request.method !== "GET" && request.method !== "HEAD" && request.body
        ? interpolateVariables(request.body, envVariables)
        : undefined,
  };
}

function applyAuth(
  request: ApiRequest,
  headers: Record<string, string>,
  envVariables: Record<string, string>,
): void {
  const { auth } = request;

  switch (auth.type) {
    case "bearer":
      if (auth.bearer?.token) {
        headers.Authorization = `Bearer ${interpolateVariables(auth.bearer.token, envVariables)}`;
      }
      break;
    case "basic":
      if (auth.basic?.username) {
        const creds = btoa(`${auth.basic.username}:${auth.basic.password ?? ""}`);
        headers.Authorization = `Basic ${creds}`;
      }
      break;
    case "api-key":
      if (auth.apiKey && auth.apiKey.placement === "header") {
        headers[auth.apiKey.key] = interpolateVariables(auth.apiKey.value, envVariables);
      }
      break;
  }
}

/**
 * Execute request using native fetch with optional pre-request and test scripts.
 */
export async function executeApiRequest(
  request: ApiRequest,
  envVariables: Record<string, string>,
  options?: {
    preRequestScript?: string;
    testScript?: string;
  },
): Promise<
  ApiResponse & {
    preRequestResult?: { logs: string[]; error: string | null; durationMs: number };
    testResult?: {
      logs: string[];
      error: string | null;
      durationMs: number;
      testResults: Array<{ name: string; passed: boolean; error?: string }>;
    };
  }
> {
  // 1. Validation
  validateRequest(request, options);

  // 2. Prepare URL and Initial Config
  const queryParams = request.params
    .filter((p) => p.enabled && p.key)
    .map(
      (p) =>
        `${encodeURIComponent(interpolateVariables(p.key, envVariables))}=${encodeURIComponent(interpolateVariables(p.value, envVariables))}`,
    )
    .join("&");

  const url = interpolateVariables(request.url, envVariables);
  const fullUrl = queryParams ? `${url}?${queryParams}` : url;

  if (!validateUrl(fullUrl).valid) throw new Error(validateUrl(fullUrl).error);

  let config = buildRequestConfig(request, envVariables, fullUrl);
  let mutatedEnv = { ...envVariables };

  // 3. Pre-request Script
  let preRequestResult: { logs: string[]; error: string | null; durationMs: number } | undefined;
  if (options?.preRequestScript?.trim()) {
    const preStartTime = Date.now();
    const result = runPreRequestScript(options.preRequestScript, {
      request,
      config,
      envVariables: mutatedEnv,
    });
    config = result.config;
    mutatedEnv = result.envVariables;
    preRequestResult = {
      logs: result.result.logs,
      error: result.result.error,
      durationMs: Date.now() - preStartTime,
    };
  }

  const finalUrl = config.url ?? fullUrl;
  config.headers = sanitizeHeaders(config.headers as Record<string, string>);

  // 4. Actual Execution
  const startTime = Date.now();
  const res = await fetch(finalUrl, {
    method: config.method,
    headers: config.headers as Record<string, string> | undefined,
    body: config.data as BodyInit | null | undefined,
  });
  const time = Date.now() - startTime;

  // 5. Process Output
  const responseHeaders: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  const rawData = await res.arrayBuffer();
  const { body, size } = await processResponseBody(rawData, responseHeaders["content-type"] || "");

  const apiResponse: ApiResponse = {
    status: res.status,
    statusText: res.statusText ?? "",
    headers: responseHeaders,
    body,
    time,
    size,
  };

  // 6. Test Results
  let testResult:
    | {
        logs: string[];
        error: string | null;
        durationMs: number;
        testResults: Array<{ name: string; passed: boolean; error?: string }>;
      }
    | undefined;
  if (options?.testScript?.trim()) {
    const testStartTime = Date.now();
    const { testResults, execution } = runTestScript(options.testScript, {
      request,
      response: apiResponse,
      envVariables: mutatedEnv,
    });
    testResult = {
      logs: execution.logs,
      error: execution.error,
      durationMs: Date.now() - testStartTime,
      testResults,
    };
  }

  return { ...apiResponse, preRequestResult, testResult };
}

function validateRequest(
  request: ApiRequest,
  options?: { preRequestScript?: string; testScript?: string },
) {
  const checks = [
    () => validateHeaders(request.headers),
    () => validateParams(request.params),
    () => validateScript(options?.preRequestScript ?? ""),
    () => validateScript(options?.testScript ?? ""),
    () => validateBodySize(request.body, request.bodyType),
  ];

  for (const check of checks) {
    const res = check();
    if (!res.valid) throw new Error(res.error);
  }
}

export interface StreamChunk {
  chunk: string;
}

export type StreamResult = ApiResponse & {
  preRequestResult?: { logs: string[]; error: string | null; durationMs: number };
  testResult?: {
    logs: string[];
    error: string | null;
    durationMs: number;
    testResults: Array<{ name: string; passed: boolean; error?: string }>;
  };
};

export async function* executeRequestStream(
  request: ApiRequest,
  envVariables: Record<string, string>,
  options?: {
    preRequestScript?: string;
    testScript?: string;
    abortSignal?: AbortSignal;
  },
): AsyncGenerator<StreamChunk, StreamResult, undefined> {
  validateRequest(request, options);

  const queryParams = request.params
    .filter((p) => p.enabled && p.key)
    .map(
      (p) =>
        `${encodeURIComponent(interpolateVariables(p.key, envVariables))}=${encodeURIComponent(interpolateVariables(p.value, envVariables))}`,
    )
    .join("&");

  const url = interpolateVariables(request.url, envVariables);
  const fullUrl = queryParams ? `${url}?${queryParams}` : url;

  if (!validateUrl(fullUrl).valid) throw new Error(validateUrl(fullUrl).error);

  let config = buildRequestConfig(request, envVariables, fullUrl);
  let mutatedEnv = { ...envVariables };

  let preRequestResult: { logs: string[]; error: string | null; durationMs: number } | undefined;
  if (options?.preRequestScript?.trim()) {
    const preStartTime = Date.now();
    const result = runPreRequestScript(options.preRequestScript, {
      request,
      config,
      envVariables: mutatedEnv,
    });
    config = result.config;
    mutatedEnv = result.envVariables;
    preRequestResult = {
      logs: result.result.logs,
      error: result.result.error,
      durationMs: Date.now() - preStartTime,
    };
  }

  const finalUrl = config.url ?? fullUrl;
  config.headers = sanitizeHeaders(config.headers as Record<string, string>);

  const startTime = Date.now();
  const res = await fetch(finalUrl, {
    method: config.method,
    headers: config.headers as Record<string, string> | undefined,
    body: config.data as BodyInit | null | undefined,
    signal: options?.abortSignal,
  });

  if (!res.body) throw new Error("Response body is null");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const responseHeaders: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  const contentType = responseHeaders["content-type"] || "";
  const isText =
    contentType.includes("application/json") ||
    contentType.includes("text/") ||
    contentType.includes("application/xml");

  let fullBody = "";
  const binaryChunks: Uint8Array[] = [];
  let readError: Error | null = null;

  try {
    while (true) {
      if (options?.abortSignal?.aborted) {
        await reader.cancel();
        throw new Error("Request aborted");
      }

      const { done, value } = await reader.read();
      if (done) break;

      if (isText) {
        const chunk = decoder.decode(value, { stream: true });
        fullBody += chunk;
        yield { chunk };
      } else {
        binaryChunks.push(value);
        // For binary, we yield an empty chunk to indicate activity, or just skip yielding
        yield { chunk: "" };
      }
    }
  } catch (err) {
    readError = err instanceof Error ? err : new Error(String(err));
  } finally {
    reader.releaseLock();
  }

  const time = Date.now() - startTime;

  if (readError) throw readError;

  let finalBody: string;
  let finalSize: number;

  if (isText) {
    finalBody = fullBody;
    finalSize = new TextEncoder().encode(fullBody).length;
  } else {
    const totalLength = binaryChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of binaryChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    const processed = await processResponseBody(combined.buffer, contentType);
    finalBody = processed.body;
    finalSize = processed.size;
  }

  const apiResponse: ApiResponse = {
    status: res.status,
    statusText: res.statusText ?? "",
    headers: responseHeaders,
    body: finalBody,
    time,
    size: finalSize,
  };

  let testResult:
    | {
        logs: string[];
        error: string | null;
        durationMs: number;
        testResults: Array<{ name: string; passed: boolean; error?: string }>;
      }
    | undefined;
  if (options?.testScript?.trim()) {
    const testStartTime = Date.now();
    const { testResults, execution } = runTestScript(options.testScript, {
      request,
      response: apiResponse,
      envVariables: mutatedEnv,
    });
    testResult = {
      logs: execution.logs,
      error: execution.error,
      durationMs: Date.now() - testStartTime,
      testResults,
    };
  }

  return { ...apiResponse, preRequestResult, testResult };
}
