import type { NextRequest } from "next/server";
import { fetch as undiciFetch } from "undici";
import { runPreRequestScript, runTestScript } from "@/lib/http/scripts";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import {
  LIMITS,
  sanitizeHeaders,
  validateHeaders,
  validateMethod,
  validateParams,
  validateScript,
  validateUrl,
} from "@/lib/utils/security";
import { interpolateVariables } from "@/lib/utils/variables";
import type { AuthConfig, KeyValuePair } from "@/types";

const CONFIG_KEY = "__config";

interface ExecuteConfig {
  method: string;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  auth: AuthConfig;
  envVariables: Record<string, string>;
  preRequestScript?: string;
  testScript?: string;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function applyAuth(
  auth: AuthConfig,
  headers: Record<string, string>,
  envVariables: Record<string, string>,
): void {
  const normalizeBearerToken = (token: string) =>
    token
      .trim()
      .replace(/^Bearer\s+/i, "")
      .trim();

  switch (auth.type) {
    case "bearer":
      if (auth.bearer?.token) {
        const resolvedToken = normalizeBearerToken(
          interpolateVariables(auth.bearer.token, envVariables),
        );
        if (resolvedToken) {
          headers.Authorization = `Bearer ${resolvedToken}`;
        }
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

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: rateLimit.retryAfter ? { "Retry-After": String(rateLimit.retryAfter) } : undefined,
      },
    );
  }

  const formData = await request.formData();
  const configRaw = formData.get(CONFIG_KEY);
  if (typeof configRaw !== "string") {
    return Response.json({ error: "Missing __config in FormData" }, { status: 400 });
  }

  if (configRaw.length > LIMITS.MAX_BODY_BYTES) {
    return Response.json({ error: "Config payload too large" }, { status: 413 });
  }

  let config: ExecuteConfig;
  try {
    config = JSON.parse(configRaw) as ExecuteConfig;
  } catch {
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
    testScript,
  } = config;

  if (!validateMethod(method)) {
    return Response.json({ error: "Invalid HTTP method" }, { status: 400 });
  }

  const headersResult = validateHeaders(headerPairs);
  if (!headersResult.valid) {
    return Response.json({ error: headersResult.error }, { status: 400 });
  }

  const paramsResult = validateParams(params);
  if (!paramsResult.valid) {
    return Response.json({ error: paramsResult.error }, { status: 400 });
  }

  const preScriptResult = validateScript(preRequestScript ?? "");
  if (!preScriptResult.valid) {
    return Response.json({ error: preScriptResult.error }, { status: 400 });
  }

  const testScriptResult = validateScript(testScript ?? "");
  if (!testScriptResult.valid) {
    return Response.json({ error: testScriptResult.error }, { status: 400 });
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

  const bodyFormData = new FormData();
  let totalSize = 0;
  for (const [key, value] of formData.entries()) {
    if (key === CONFIG_KEY) continue;
    if (value instanceof File) {
      if (value.size > LIMITS.MAX_FILE_SIZE_BYTES) {
        return Response.json(
          {
            error: `File "${value.name}" exceeds maximum size of ${LIMITS.MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
          },
          { status: 413 },
        );
      }
      totalSize += value.size;
      bodyFormData.append(key, value);
    } else {
      const str = String(value);
      totalSize += new TextEncoder().encode(str).length;
      bodyFormData.append(key, str);
    }
    if (totalSize > LIMITS.MAX_FORMDATA_BYTES) {
      return Response.json(
        { error: `FormData exceeds maximum size of ${LIMITS.MAX_FORMDATA_BYTES / 1024 / 1024}MB` },
        { status: 413 },
      );
    }
  }

  let mutatedEnv = { ...envVariables };
  let finalHeaders = { ...headers };
  let finalUrl = targetUrl;
  let preRequestResult: { logs: string[]; error: string | null; durationMs: number } | undefined;

  if (preRequestScript?.trim()) {
    const preStartTime = Date.now();
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

  let testResults: Array<{ name: string; passed: boolean; error?: string }> | undefined;
  let testExecution: { logs: string[]; error: string | null } | undefined;

  if (testScript?.trim()) {
    const result = runTestScript(testScript, {
      request: { method, url: targetUrl, headers: headerPairs, params, auth } as never,
      response: apiResponse,
      envVariables: mutatedEnv,
    });
    testResults = result.testResults;
    testExecution = result.execution;
  }

  return Response.json({
    ...apiResponse,
    preRequestResult,
    testResults,
    testExecution,
  });
}
