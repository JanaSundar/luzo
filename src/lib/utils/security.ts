import ipaddr from "ipaddr.js";

const ALLOWED_SCHEMES = ["http:", "https:"] as const;
const MAX_URL_LENGTH = 2048;
const MAX_HEADERS = 50;
const MAX_PARAMS = 100;
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB for JSON/Raw
const MAX_FORMDATA_BYTES = 50 * 1024 * 1024; // 50MB for FormData
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB per file
const MAX_SCRIPT_LENGTH = 10 * 1024; // 10KB

/** Headers that must not be set by user (server controls these) */
const FORBIDDEN_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "keep-alive",
  "upgrade",
  "proxy-authorization",
  "te",
  "trailer",
  "proxy-connection",
]);

/** Private/internal hostnames - blocked for SSRF protection */
const BLOCKED_HOSTNAMES = new Set(["localhost"]);

/** IP ranges that are considered internal/private and should be blocked */
const INTERNAL_RANGES = ["private", "loopback", "unspecified", "linkLocal", "uniqueLocal"];

/** Dangerous patterns in scripts - block execution if present */
const SCRIPT_BLOCKED_PATTERNS = [
  /\b(?:process|require|import|eval|Function|global|globalThis)\b/,
  /\bconstructor\s*\.\s*constructor/,
  /__proto__|prototype\s*\.\s*constructor/,
  /\[['"]constructor['"]\]/,
  /\b(?:child_process|fs|path|os|net|dns)\b/,
  /\.\s*constructor\s*\(/,
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateUrl(url: string): ValidationResult {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "URL is required" };
  }
  if (url.length > MAX_URL_LENGTH) {
    return { valid: false, error: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters` };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  if (!ALLOWED_SCHEMES.includes(parsed.protocol as (typeof ALLOWED_SCHEMES)[number])) {
    return { valid: false, error: "Only http and https URLs are allowed" };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 1. Check if the hostname is an IP address and if it's in a blocked range
  if (ipaddr.isValid(hostname)) {
    try {
      const addr = ipaddr.parse(hostname);
      const range = addr.range();
      if (INTERNAL_RANGES.includes(range)) {
        return { valid: false, error: "Requests to internal/private addresses are not allowed" };
      }
    } catch (_error: unknown) {
      // If parsing fails despite isValid (unlikely), block it to be safe if it looks like an IP
      return { valid: false, error: "Invalid IP address format" };
    }
  }

  // 2. Check for disallowed hostnames (e.g., "localhost")
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, error: "Requests to internal/private addresses are not allowed" };
  }

  return { valid: true };
}

export function sanitizeHeader(key: string, value: string): ValidationResult {
  const crlf = /[\r\n]/;
  if (crlf.test(key) || crlf.test(value) || key.includes("\0") || value.includes("\0")) {
    return { valid: false, error: "Header keys and values cannot contain CRLF or null bytes" };
  }
  const keyLower = key.toLowerCase().trim();
  if (FORBIDDEN_HEADERS.has(keyLower)) {
    return { valid: false, error: `Header "${key}" is not allowed` };
  }
  if (!/^[a-zA-Z0-9\-_]+$/.test(key)) {
    return { valid: false, error: "Header key contains invalid characters" };
  }
  return { valid: true };
}

export function validateHeaders(
  headers: Array<{ key: string; value: string; enabled?: boolean }>
): ValidationResult {
  const enabled = headers.filter((h) => h.enabled !== false && h.key);
  if (enabled.length > MAX_HEADERS) {
    return { valid: false, error: `Maximum ${MAX_HEADERS} headers allowed` };
  }
  for (const h of enabled) {
    const result = sanitizeHeader(h.key, h.value);
    if (!result.valid) return result;
  }
  return { valid: true };
}

export function validateParams(
  params: Array<{ key: string; value: string; enabled?: boolean }>
): ValidationResult {
  const enabled = params.filter((p) => p.enabled !== false && p.key);
  if (enabled.length > MAX_PARAMS) {
    return { valid: false, error: `Maximum ${MAX_PARAMS} query parameters allowed` };
  }
  return { valid: true };
}

export function validateBodySize(body: string | null, _bodyType: string): ValidationResult {
  if (!body) return { valid: true };
  const bytes = new TextEncoder().encode(body).length;
  if (bytes > MAX_BODY_BYTES) {
    return {
      valid: false,
      error: `Body exceeds maximum size of ${MAX_BODY_BYTES / 1024 / 1024}MB`,
    };
  }
  return { valid: true };
}

export function validateScript(script: string): ValidationResult {
  if (!script?.trim()) return { valid: true };
  if (script.length > MAX_SCRIPT_LENGTH) {
    return {
      valid: false,
      error: `Script exceeds maximum length of ${MAX_SCRIPT_LENGTH / 1024}KB`,
    };
  }
  for (const pattern of SCRIPT_BLOCKED_PATTERNS) {
    if (pattern.test(script)) {
      return { valid: false, error: "Script contains disallowed code patterns" };
    }
  }
  return { valid: true };
}

export function validateMethod(
  method: string
): method is "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS" {
  const allowed = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
  return allowed.includes(method?.toUpperCase());
}

/** Sanitize headers object - remove invalid/forbidden entries, return clean object */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const r = sanitizeHeader(key, value);
    if (r.valid) result[key] = value;
  }
  return result;
}

export const LIMITS = {
  MAX_URL_LENGTH,
  MAX_HEADERS,
  MAX_PARAMS,
  MAX_BODY_BYTES,
  MAX_FORMDATA_BYTES,
  MAX_FILE_SIZE_BYTES,
  MAX_SCRIPT_LENGTH,
} as const;
