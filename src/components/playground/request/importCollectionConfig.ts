import { importOpenApiCollection, importPostmanCollection } from "@/lib/utils/collection-import";

export type ImportMode = "curl" | "openapi" | "postman";

export const IMPORT_MODES: Array<{ description: string; id: ImportMode; label: string }> = [
  { id: "curl", label: "cURL", description: "Convert a single command into a request." },
  { id: "postman", label: "Postman", description: "Create a DB-backed collection from JSON." },
  { id: "openapi", label: "OpenAPI", description: "Generate a collection from your API schema." },
];

export function getImportPlaceholder(mode: ImportMode | undefined) {
  if (mode === "curl") {
    return `curl 'https://api.example.com/users' -X POST -H 'Content-Type: application/json' --data '{"name":"Ada"}'`;
  }
  if (mode === "postman") {
    return `{\n  "info": { "name": "Workspace API" },\n  "item": []\n}`;
  }
  return `{\n  "openapi": "3.1.0",\n  "info": { "title": "Workspace API" },\n  "paths": {}\n}`;
}

export function importStructuredCollection(mode: Exclude<ImportMode, "curl">, source: string) {
  return mode === "postman" ? importPostmanCollection(source) : importOpenApiCollection(source);
}
