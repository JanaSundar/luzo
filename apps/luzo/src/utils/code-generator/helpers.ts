import type { ApiRequest } from "@/types";

export function buildHeaders(request: ApiRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const h of request.headers.filter((h) => h.enabled && h.key)) {
    headers[h.key] = h.value;
  }

  switch (request.auth.type) {
    case "bearer":
      headers["Authorization"] = `Bearer ${request.auth.bearer?.token ?? ""}`;
      break;
    case "basic":
      headers["Authorization"] =
        `Basic ${btoa(`${request.auth.basic?.username}:${request.auth.basic?.password ?? ""}`)}`;
      break;
    case "api-key":
      if (request.auth.apiKey?.placement === "header") {
        headers[request.auth.apiKey.key] = request.auth.apiKey.value;
      }
      break;
  }

  return headers;
}

export function buildUrl(request: ApiRequest): string {
  const enabledParams = request.params.filter((p) => p.enabled && p.key);
  if (!enabledParams.length) return request.url;
  const qs = enabledParams
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join("&");
  return `${request.url}?${qs}`;
}

export function getFormDataFields(request: ApiRequest) {
  return (request.formDataFields ?? []).filter((f) => f.enabled && f.key);
}

export function hasFormDataBody(request: ApiRequest): boolean {
  return (
    request.bodyType === "form-data" &&
    getFormDataFields(request).length > 0 &&
    request.method !== "GET"
  );
}

export function getBodyForRequest(request: ApiRequest): string | null {
  if (request.bodyType === "form-data") return null;
  return request.body;
}
