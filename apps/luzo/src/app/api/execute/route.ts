import type { NextRequest } from "next/server";
import { fetch as undiciFetch } from "undici";
import { runPostRequestScript, runPreRequestScript, runTestScript } from "@/services/http/scripts";
import {
  CONFIG_KEY,
  applyAuth,
  buildFormPayload,
  getClientIp,
  type ExecuteConfig,
  validateExecuteConfig,
} from "./execute-form-helpers";
import { checkRateLimit } from "@/utils/rate-limit";
import { LIMITS, sanitizeHeaders, validateUrl } from "@/utils/security";
import { interpolateVariables } from "@/utils/variables";
import { logger } from "@/utils/logger";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip);

  logger.info({ requestId, ip, path: "/api/execute" }, "Execute request received");

  if (!rateLimit.allowed) {
    logger.warn({ requestId, ip }, "Rate limit exceeded for execute request");
    return Response.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: rateLimit.retryAfter ? { "Retry-After": String(rateLimit.retryAfter) } : undefined,
      },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    logger.warn(
      { requestId, error: err instanceof Error ? err.message : String(err) },
      "Failed to parse FormData in execute request",
    );
    return Response.json({ error: "Invalid FormData" }, { status: 400 });
  }

  const configRaw = formData.get(CONFIG_KEY);
  if (typeof configRaw !== "string") {
    logger.warn({ requestId }, "Missing __config in execute request");
    return Response.json({ error: "Missing __config in FormData" }, { status: 400 });
  }

  if (configRaw.length > LIMITS.MAX_BODY_BYTES) {
    logger.warn(
      { requestId, size: configRaw.length },
      "Config payload too large in execute request",
    );
    return Response.json({ error: "Config payload too large" }, { status: 413 });
  }

  let config: ExecuteConfig;
  try {
    config = JSON.parse(configRaw) as ExecuteConfig;
  } catch (err) {
    logger.warn(
      { requestId, error: err instanceof Error ? err.message : String(err) },
      "Invalid JSON in __config",
    );
    return Response.json({ error: "Invalid __config JSON" }, { status: 400 });
  }

  const {
    method,
    url,
    headers: headerPairs,
    params,
    auth,
    envVariables,
    preRequestScript,
    postRequestScript,
    testScript,
  } = config;

  logger.info({ requestId, method, url }, "Executing remote request");

  const validationError = validateExecuteConfig(config);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const fullUrl = interpolateVariables(url, envVariables);
  const queryParams = params
    .filter((p) => p.enabled && p.key)
    .map(
      (p) =>
        `${encodeURIComponent(interpolateVariables(p.key, envVariables))}=${encodeURIComponent(interpolateVariables(p.value, envVariables))}`,
    )
    .join("&");
  const targetUrl = queryParams ? `${fullUrl}?${queryParams}` : fullUrl;

  const urlResult = validateUrl(targetUrl);
  if (!urlResult.valid) {
    return Response.json({ error: urlResult.error }, { status: 400 });
  }

  const headers: Record<string, string> = {};
  for (const h of headerPairs.filter((h) => h.enabled && h.key)) {
    const k = h.key.toLowerCase();
    if (k === "content-type") continue;
    headers[interpolateVariables(h.key, envVariables)] = interpolateVariables(
      h.value,
      envVariables,
    );
  }
  applyAuth(auth, headers, envVariables);

  const payload = buildFormPayload(formData);
  if (payload.error) {
    return Response.json({ error: payload.error }, { status: payload.status });
  }
  const bodyFormData = payload.bodyFormData;

  let mutatedEnv = { ...envVariables };
  let finalHeaders = { ...headers };
  let finalUrl = targetUrl;
  let preRequestResult: { logs: string[]; error: string | null; durationMs: number } | undefined;

  if (preRequestScript?.trim()) {
    const preStartTime = Date.now();
    logger.debug({ requestId }, "Running pre-request script");
    const result = runPreRequestScript(preRequestScript, {
      request: { method, url: targetUrl, headers: headerPairs, params, auth } as never,
      config: { method, url: targetUrl, headers: finalHeaders, data: bodyFormData },
      envVariables: mutatedEnv,
    });
    finalHeaders = { ...(result.config.headers as Record<string, string>) };
    finalUrl = result.config.url ?? targetUrl;
    mutatedEnv = result.envVariables;
    preRequestResult = {
      logs: result.result.logs,
      error: result.result.error,
      durationMs: Date.now() - preStartTime,
    };
  }

  const finalUrlResult = validateUrl(finalUrl);
  if (!finalUrlResult.valid) {
    return Response.json({ error: finalUrlResult.error }, { status: 400 });
  }

  const safeHeaders = sanitizeHeaders(finalHeaders);

  const startTime = Date.now();
  try {
    const res = await undiciFetch(finalUrl, {
      method,
      headers: safeHeaders,
      // Node 18+ undici fetch supports FormData bodies; cast to satisfy TypeScript.
      body: bodyFormData as unknown as import("undici").BodyInit,
    });
    const time = Date.now() - startTime;

    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value;
    });

    const rawContentType = responseHeaders["content-type"] ?? "";
    const contentType = (rawContentType.toLowerCase().split(";")[0] ?? "").trim();
    const isImage = contentType.startsWith("image/");
    const isPdf = contentType === "application/pdf";
    const isBinaryPreview = isImage || isPdf;

    const rawData = await res.arrayBuffer();
    const size = rawData.byteLength;
    let body: string;
    if (isBinaryPreview && rawData.byteLength > 0) {
      body = Buffer.from(rawData).toString("base64");
    } else {
      body = typeof rawData === "string" ? rawData : new TextDecoder().decode(rawData);
    }

    const apiResponse = {
      status: res.status,
      statusText: res.statusText ?? "",
      headers: responseHeaders,
      body,
      time,
      size,
    };
    let finalResponse = apiResponse;
    let postRequestResult: { logs: string[]; error: string | null; durationMs: number } | undefined;

    if (postRequestScript?.trim()) {
      const postStartTime = Date.now();
      logger.debug({ requestId }, "Running post-request script");
      const result = runPostRequestScript(postRequestScript, {
        request: { method, url: targetUrl, headers: headerPairs, params, auth } as never,
        response: apiResponse,
        envVariables: mutatedEnv,
      });
      finalResponse = result.response;
      mutatedEnv = result.envVariables;
      postRequestResult = {
        logs: result.result.logs,
        error: result.result.error,
        durationMs: Date.now() - postStartTime,
      };
    }

    let testResults: Array<{ name: string; passed: boolean; error?: string }> | undefined;
    let testExecution: { logs: string[]; error: string | null } | undefined;

    if (testScript?.trim()) {
      logger.debug({ requestId }, "Running test script");
      const result = runTestScript(testScript, {
        request: { method, url: targetUrl, headers: headerPairs, params, auth } as never,
        response: finalResponse,
        envVariables: mutatedEnv,
      });
      testResults = result.testResults;
      testExecution = result.execution;
    }

    logger.info({ requestId, status: res.status, time }, "Remote request completed successfully");

    return Response.json({
      ...finalResponse,
      preRequestResult,
      postRequestResult,
      testResults,
      testExecution,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Remote request failed";
    logger.error({ requestId, error: errorMessage }, "Remote request failed");
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
