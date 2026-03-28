import type { NextRequest } from "next/server";
import {
  LIMITS,
  validateHeaders,
  validateMethod,
  validateParams,
  validateScript,
  validateUrl,
} from "@/utils/security";
import { interpolateVariables } from "@/utils/variables";
import type { AuthConfig, KeyValuePair } from "@/types";

export const CONFIG_KEY = "__config";

export interface ExecuteConfig {
  method: string;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  auth: AuthConfig;
  envVariables: Record<string, string>;
  preRequestScript?: string;
  postRequestScript?: string;
  testScript?: string;
}

export function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function applyAuth(
  auth: AuthConfig,
  headers: Record<string, string>,
  envVariables: Record<string, string>,
) {
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

export function validateExecuteConfig(config: ExecuteConfig) {
  if (!validateMethod(config.method)) return "Invalid HTTP method";
  const headersResult = validateHeaders(config.headers);
  if (!headersResult.valid) return headersResult.error;
  const paramsResult = validateParams(config.params);
  if (!paramsResult.valid) return paramsResult.error;

  for (const script of [config.preRequestScript, config.postRequestScript, config.testScript]) {
    const result = validateScript(script ?? "");
    if (!result.valid) return result.error;
  }

  const queryParams = config.params
    .filter((param) => param.enabled && param.key)
    .map(
      (param) =>
        `${encodeURIComponent(interpolateVariables(param.key, config.envVariables))}=${encodeURIComponent(interpolateVariables(param.value, config.envVariables))}`,
    )
    .join("&");
  const fullUrl = interpolateVariables(config.url, config.envVariables);
  const targetUrl = queryParams ? `${fullUrl}?${queryParams}` : fullUrl;
  const urlResult = validateUrl(targetUrl);
  return urlResult.valid ? null : urlResult.error;
}

export function buildFormPayload(formData: FormData) {
  const bodyFormData = new FormData();
  let totalSize = 0;

  for (const [key, value] of formData.entries()) {
    if (key === CONFIG_KEY) continue;
    if (value instanceof File) {
      if (value.size > LIMITS.MAX_FILE_SIZE_BYTES) {
        return {
          error: `File "${value.name}" exceeds maximum size of ${LIMITS.MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
          status: 413,
        };
      }
      totalSize += value.size;
      bodyFormData.append(key, value);
    } else {
      const stringValue = String(value);
      totalSize += new TextEncoder().encode(stringValue).length;
      bodyFormData.append(key, stringValue);
    }
    if (totalSize > LIMITS.MAX_FORMDATA_BYTES) {
      return {
        error: `FormData exceeds maximum size of ${LIMITS.MAX_FORMDATA_BYTES / 1024 / 1024}MB`,
        status: 413,
      };
    }
  }

  return { bodyFormData, error: null, status: 200 };
}
