import { processResponseBody } from "@/utils/response-processor";
import { sanitizeHeaders, validateHeaders } from "@/utils/security";
import type { ApiRequest, ApiResponse } from "@/types";
import {
  applyResponseScripts,
  buildPreparedExecutionContext,
  type ExecutionOptions,
  type ScriptRunResult,
  type TestRunResult,
  validateExecutionRequest,
} from "./execution-scripts";
import { buildRequestConfig, type HttpRequestConfig } from "./request-config";

export { buildRequestConfig } from "./request-config";

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

/**
 * Execute request using native fetch with optional pre-request and test scripts.
 * Consolidates logic by internally using executeRequestStream.
 */
export async function executeApiRequest(
  request: ApiRequest,
  envVariables: Record<string, string>,
  options?: ExecutionOptions,
): Promise<StreamResult> {
  const generator = executeRequestStream(request, envVariables, options);

  let result = await generator.next();
  while (!result.done) {
    result = await generator.next();
  }

  return result.value as StreamResult;
}

function validateRequest(request: ApiRequest, options?: ExecutionOptions) {
  const headersResult = validateHeaders(request.headers);
  if (!headersResult.valid) throw new Error(headersResult.error);
  validateExecutionRequest(request, options);
}

export interface StreamChunk {
  chunk: string;
}

export type StreamResult = ApiResponse & {
  postRequestResult?: ScriptRunResult;
  preRequestResult?: ScriptRunResult;
  testResult?: TestRunResult;
};

export async function* executeRequestStream(
  request: ApiRequest,
  envVariables: Record<string, string>,
  options?: ExecutionOptions,
): AsyncGenerator<StreamChunk, StreamResult, undefined> {
  validateRequest(request, options);
  const { finalUrl, config, mutatedEnv, preRequestResult } = buildPreparedExecutionContext(
    request,
    envVariables,
    options,
  );
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

  const { finalResponse, postRequestResult, testResult } = applyResponseScripts(
    request,
    apiResponse,
    mutatedEnv,
    options,
  );

  return { ...finalResponse, postRequestResult, preRequestResult, testResult };
}
