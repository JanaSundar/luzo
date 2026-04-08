import { sanitizeHeader } from "@/utils/security";
import { interpolateVariables } from "@/utils/variables";
import type { ApiRequest } from "@/types";

export interface HttpRequestConfig {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  data?: unknown;
}

export function buildRequestConfig(
  request: ApiRequest,
  envVariables: Record<string, string>,
  fullUrl: string,
): HttpRequestConfig {
  const headers: Record<string, string> = {};

  for (const header of request.headers.filter((entry) => entry.enabled && entry.key)) {
    const key = interpolateVariables(header.key, envVariables);
    const value = interpolateVariables(header.value, envVariables);
    const { valid } = sanitizeHeader(key, value);
    if (valid) headers[key] = value;
  }

  const hasContentType = Object.keys(headers).some((key) => key.toLowerCase() === "content-type");
  if (!hasContentType && request.body && request.method !== "GET") {
    headers["Content-Type"] =
      request.bodyType === "x-www-form-urlencoded"
        ? "application/x-www-form-urlencoded"
        : "application/json";
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
) {
  const { auth } = request;
  const normalizeBearerToken = (token: string) =>
    token
      .trim()
      .replace(/^Bearer\s+/i, "")
      .trim();

  switch (auth.type) {
    case "bearer":
      if (auth.bearer?.token) {
        const token = normalizeBearerToken(interpolateVariables(auth.bearer.token, envVariables));
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      break;
    case "basic":
      if (auth.basic?.username) {
        headers.Authorization = `Basic ${btoa(`${auth.basic.username}:${auth.basic.password ?? ""}`)}`;
      }
      break;
    case "api-key":
      if (auth.apiKey && auth.apiKey.placement === "header") {
        headers[auth.apiKey.key] = interpolateVariables(auth.apiKey.value, envVariables);
      }
      break;
  }
}
