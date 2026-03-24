import type { Collection, Pipeline } from "@/types";
import type { ExportableCollection, ExportableRequest } from "./types";

/**
 * Exports a Luzo Pipeline to Postman Collection v2.1.0 format.
 */
export function exportPipelineToPostman(pipeline: Pipeline): string {
  return exportToPostman({
    name: pipeline.name,
    description: pipeline.description,
    items: pipeline.steps,
  });
}

/**
 * Exports a Luzo Collection to Postman Collection v2.1.0 format.
 */
export function exportCollectionToPostman(collection: Collection): string {
  const items: ExportableRequest[] = collection.requests.map((sr) => ({
    ...sr.request,
    name: sr.name,
  }));
  return exportToPostman({ name: collection.name, description: collection.description, items });
}

function exportToPostman(source: ExportableCollection): string {
  return JSON.stringify(
    {
      info: {
        name: source.name,
        description: source.description || "Exported from Luzo",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: source.items.map(mapItemToPostman),
    },
    null,
    2,
  );
}

function mapItemToPostman(item: ExportableRequest) {
  const parsedUrl = safeUrl(item.url);
  return {
    name: item.name,
    request: {
      method: item.method,
      header: item.headers.map((h) => ({
        key: h.key,
        value: h.value,
        type: "text",
        disabled: !h.enabled,
      })),
      url: {
        raw: item.url,
        protocol: item.url.startsWith("https") ? "https" : "http",
        host: [parsedUrl.hostname],
        path: parsedUrl.pathname.split("/").filter(Boolean),
        query: item.params.map((p) => ({ key: p.key, value: p.value, disabled: !p.enabled })),
      },
      body: mapBody(item),
      auth: mapAuth(item),
    },
  };
}

function mapBody(item: ExportableRequest) {
  if (item.bodyType === "none" || !item.body) return undefined;

  switch (item.bodyType) {
    case "json":
      return { mode: "raw", raw: item.body, options: { raw: { language: "json" } } };
    case "x-www-form-urlencoded":
      return {
        mode: "urlencoded",
        urlencoded: item.body.split("&").map((pair) => {
          const [key, value] = pair.split("=");
          return {
            key: decodeURIComponent(key || ""),
            value: decodeURIComponent(value || ""),
            type: "text",
            enabled: true,
          };
        }),
      };
    case "form-data":
      return {
        mode: "formdata",
        formdata: (item.formDataFields || []).map((f) => ({
          key: f.key,
          value: f.type === "text" ? f.value : "",
          type: f.type,
          src: f.type === "file" ? f.fileName : undefined,
          disabled: !f.enabled,
        })),
      };
    case "raw":
      return { mode: "raw", raw: item.body };
    default:
      return undefined;
  }
}

function mapAuth(item: ExportableRequest) {
  const { auth } = item;
  if (auth.type === "none") return undefined;

  switch (auth.type) {
    case "bearer":
      return {
        type: "bearer",
        bearer: [{ key: "token", value: auth.bearer?.token, type: "string" }],
      };
    case "basic":
      return {
        type: "basic",
        basic: [
          { key: "username", value: auth.basic?.username, type: "string" },
          { key: "password", value: auth.basic?.password, type: "string" },
        ],
      };
    case "api-key":
      return {
        type: "apikey",
        apikey: [
          { key: "key", value: auth.apiKey?.key, type: "string" },
          { key: "value", value: auth.apiKey?.value, type: "string" },
          { key: "in", value: auth.apiKey?.placement || "header", type: "string" },
        ],
      };
    default:
      return { type: auth.type };
  }
}

function safeUrl(raw: string) {
  return new URL(raw.startsWith("http") ? raw : `https://${raw}`);
}
