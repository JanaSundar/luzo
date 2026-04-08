import { getDbCacheKey } from "@/utils/dbCacheKey";

interface WebhookTokenPayload {
  dbKey: string;
  endpointId: string;
}

export function createWebhookToken(dbUrl: string, endpointId: string) {
  const payload: WebhookTokenPayload = {
    dbKey: getDbCacheKey(dbUrl),
    endpointId,
  };
  return encodeBase64Url(JSON.stringify(payload));
}

export function parseWebhookToken(token: string): WebhookTokenPayload | null {
  try {
    const parsed = JSON.parse(decodeBase64Url(token));
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.dbKey === "string" &&
      typeof parsed.endpointId === "string"
    ) {
      return parsed as WebhookTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

function encodeBase64Url(value: string) {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    const bytes = new TextEncoder().encode(value);
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(value, "base64url").toString("utf8");
}
