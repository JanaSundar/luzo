import type { Collection, Pipeline } from "@/types";
import type { ExportableCollection, ExportableRequest } from "./types";

/**
 * Exports a Luzo Pipeline to OpenAPI 3.0.0 format.
 */
export function exportPipelineToOpenApi(pipeline: Pipeline): string {
  return exportToOpenApi({
    name: pipeline.name,
    description: pipeline.description,
    items: pipeline.steps,
  });
}

/**
 * Exports a Luzo Collection to OpenAPI 3.0.0 format.
 */
export function exportCollectionToOpenApi(collection: Collection): string {
  const items: ExportableRequest[] = collection.requests.map((sr) => ({
    ...sr.request,
    name: sr.name,
  }));
  return exportToOpenApi({ name: collection.name, description: collection.description, items });
}

function exportToOpenApi(source: ExportableCollection): string {
  const spec: Record<string, unknown> = {
    openapi: "3.0.0",
    info: {
      title: source.name,
      description: source.description || "Exported from Luzo",
      version: "1.0.0",
    },
    paths: {} as Record<string, Record<string, unknown>>,
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer" },
        basicAuth: { type: "http", scheme: "basic" },
        apiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
      },
    },
  };

  const paths = spec.paths as Record<string, Record<string, unknown>>;

  for (const item of source.items) {
    const url = safeUrl(item.url);
    const path = url.pathname || "/";
    const method = item.method.toLowerCase();
    if (!paths[path]) paths[path] = {};

    const operation: Record<string, unknown> = {
      summary: item.name,
      parameters: [
        ...item.params.map((p) => ({
          name: p.key,
          in: "query",
          schema: { type: "string" },
          example: p.value,
        })),
        ...item.headers.map((h) => ({
          name: h.key,
          in: "header",
          schema: { type: "string" },
          example: h.value,
        })),
      ],
      responses: { 200: { description: "Successful response" } },
    };

    if (item.body && item.bodyType !== "none") {
      operation.requestBody = mapBody(item);
    }

    const security = mapAuth(item);
    if (security) operation.security = [security];

    paths[path][method] = operation;
  }

  return JSON.stringify(spec, null, 2);
}

function mapBody(item: ExportableRequest) {
  let contentType: string;
  switch (item.bodyType) {
    case "json":
      contentType = "application/json";
      break;
    case "x-www-form-urlencoded":
      contentType = "application/x-www-form-urlencoded";
      break;
    case "form-data":
      contentType = "multipart/form-data";
      break;
    default:
      contentType = "text/plain";
      break;
  }

  return {
    content: {
      [contentType]: {
        schema: { type: "object" },
        ...(item.bodyType === "json" ? { example: tryParseJson(item.body!) } : {}),
      },
    },
  };
}

function mapAuth(item: ExportableRequest) {
  switch (item.auth.type) {
    case "bearer":
      return { bearerAuth: [] };
    case "basic":
      return { basicAuth: [] };
    case "api-key":
      return { apiKeyAuth: [] };
    default:
      return undefined;
  }
}

function tryParseJson(val: string) {
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

function safeUrl(raw: string) {
  return new URL(raw.startsWith("http") ? raw : `https://${raw}`);
}
