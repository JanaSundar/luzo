import type { ApiRequest } from "@/types";
import {
  buildHeaders,
  buildUrl,
  getBodyForRequest,
  getFormDataFields,
  hasFormDataBody,
} from "./helpers";

export function generateCurl(request: ApiRequest): string {
  const url = buildUrl(request);
  const headers = buildHeaders(request);
  const parts = [`curl -X ${request.method} '${url}'`];

  for (const [key, value] of Object.entries(headers)) {
    const k = key.toLowerCase();
    if (k === "content-type" && hasFormDataBody(request)) continue;
    parts.push(`  -H '${key}: ${value}'`);
  }

  if (hasFormDataBody(request)) {
    for (const f of getFormDataFields(request)) {
      if (f.type === "file") {
        parts.push(`  -F '${f.key}=@/path/to/file'`);
      } else {
        parts.push(`  -F '${f.key}=${f.value.replace(/'/g, "'\\''")}'`);
      }
    }
  } else if (getBodyForRequest(request) && request.method !== "GET") {
    parts.push(`  -d '${getBodyForRequest(request)}'`);
  }

  return parts.join(" \\\n");
}
