import { importPostmanCollection } from "@/utils/collection-import";
import type { Collection, NormalizedCollectionInput, NormalizedCollectionRequest } from "@/types";

type LuzoCollectionLike = {
  id?: string;
  name?: string;
  requests?: Array<{
    id?: string;
    name?: string;
    request?: Collection["requests"][number]["request"];
  }>;
};

export function loadCollectionGenerationSource(
  source:
    | { fileName?: string; sourceType: "luzo_json" | "postman_json"; text: string }
    | { collection: Collection; sourceType?: "stored_collection" },
): NormalizedCollectionInput {
  if ("collection" in source) {
    return {
      requests: source.collection.requests.map((request, index) => ({
        folderPath: [],
        request: request.request,
        sourceName: request.name,
        sourceRequestId: request.id || `stored-${index + 1}`,
        warnings: [],
      })),
      source: {
        collectionId: source.collection.id,
        collectionName: source.collection.name,
        sourceType: source.sourceType ?? "stored_collection",
      },
      warnings: [],
    };
  }

  return source.sourceType === "postman_json"
    ? normalizePostmanText(source.text, source.fileName)
    : normalizeLuzoText(source.text, source.fileName);
}

function normalizePostmanText(text: string, fileName?: string): NormalizedCollectionInput {
  const imported = importPostmanCollection(text);
  return {
    requests: imported.requests.map((request, index) => {
      const segments = request.name.split(" / ").filter(Boolean);
      return {
        folderPath: segments.slice(0, -1),
        request: request.request,
        sourceName: segments.at(-1) ?? request.name,
        sourceRequestId: `postman-${index + 1}`,
        warnings: request.request.url ? [] : ["Request URL is empty."],
      };
    }),
    source: {
      collectionName: imported.name,
      fileName,
      sourceType: "postman_json",
    },
    warnings: imported.requests.length > 0 ? [] : ["No requests found in uploaded Postman JSON."],
  };
}

function normalizeLuzoText(text: string, fileName?: string): NormalizedCollectionInput {
  const parsed = parseJson(text) as LuzoCollectionLike;
  const requests = Array.isArray(parsed.requests) ? parsed.requests : [];
  if (!parsed.name || requests.length === 0) {
    throw new Error("Paste a valid Luzo collection JSON.");
  }

  const warnings: string[] = [];
  const normalized = requests.flatMap<NormalizedCollectionRequest>((request, index) => {
    if (!request?.request) {
      warnings.push(
        `Skipped ${request?.name || `request ${index + 1}`} because the payload is missing.`,
      );
      return [];
    }
    return [
      {
        folderPath: [],
        request: request.request,
        sourceName: request.name || `Request ${index + 1}`,
        sourceRequestId: request.id || `luzo-${index + 1}`,
        warnings: request.request.url ? [] : ["Request URL is empty."],
      },
    ];
  });

  return {
    requests: normalized,
    source: {
      collectionName: parsed.name,
      fileName,
      sourceType: "luzo_json",
    },
    warnings,
  };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Paste valid JSON to continue.");
  }
}
