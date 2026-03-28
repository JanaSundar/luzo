import type { ApiResponse } from "@/types";

/**
 * Sensitive headers that should be redacted from AI-safe responses.
 */
const SENSITIVE_HEADERS = [
  "authorization",
  "set-cookie",
  "cookie",
  "x-api-key",
  "api-key",
  "proxy-authorization",
];

/**
 * Common sensitive JSON keys to mask.
 */
const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "credential",
  "private_key",
  "access_token",
  "refresh_token",
];

/**
 * Derives an AI-safe version of an API response by redacting sensitive headers
 * and masking sensitive fields in the response body.
 */
export function deriveAiSafeResponse(raw: ApiResponse): Partial<ApiResponse> {
  const safeHeaders: Record<string, string> = {};

  if (raw.headers) {
    for (const [key, value] of Object.entries(raw.headers)) {
      if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
        safeHeaders[key] = "[REDACTED]";
      } else {
        safeHeaders[key] = value;
      }
    }
  }

  let safeBody: string = raw.body;
  if (typeof raw.body === "object" && raw.body !== null) {
    // If body somehow is an object (though type says string)
    safeBody = JSON.stringify(maskSensitiveFields(raw.body));
  } else if (typeof raw.body === "string") {
    try {
      const parsed = JSON.parse(raw.body);
      safeBody = JSON.stringify(maskSensitiveFields(parsed));
    } catch {
      // Not JSON, keep as is or redact if it looks like a token
      if (raw.body.length > 100 && !raw.body.includes(" ")) {
        safeBody = "[REDACTED_POTENTIAL_TOKEN]";
      }
    }
  }

  return {
    status: raw.status,
    statusText: raw.statusText,
    headers: safeHeaders,
    body: safeBody,
    time: raw.time,
    size: raw.size,
  };
}

function maskSensitiveFields(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveFields);
  }

  if (obj !== null && typeof obj === "object") {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        masked[key] = "[MASKED]";
      } else {
        masked[key] = maskSensitiveFields(value);
      }
    }
    return masked;
  }

  return obj;
}
