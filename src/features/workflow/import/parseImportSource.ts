import { importOpenApiCollection, importPostmanCollection } from "@/utils/collection-import";
import { importCurlToRequest } from "@/utils/curl-import";

export interface ParseImportSourceInput {
  sourceType: "postman" | "openapi" | "curl";
  content: string;
}

export interface ParseImportSourceOutput {
  collection: unknown;
}

export function parseImportSource(input: ParseImportSourceInput): ParseImportSourceOutput {
  switch (input.sourceType) {
    case "postman":
      return { collection: importPostmanCollection(input.content) };
    case "openapi":
      return { collection: importOpenApiCollection(input.content) };
    case "curl":
      return { collection: importCurlToRequest(input.content) };
  }
}
