import type { ApiRequest, Collection, PipelineStep, SavedRequest } from "@/types";

type StoredRequestPayload = Omit<ApiRequest, "formDataFields"> & {
  formDataFields?: Array<Omit<NonNullable<ApiRequest["formDataFields"]>[number], "file">>;
};

interface RequestRow {
  id: string;
  name: string;
  collectionId: string | null;
  data: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface CollectionRow {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export function toCollectionRequest(source: ApiRequest | PipelineStep): StoredRequestPayload {
  return {
    ...source,
    formDataFields: source.formDataFields?.map(({ file: _, ...field }) => field),
  };
}

export function toSavedRequest(row: RequestRow): SavedRequest {
  return {
    id: row.id,
    name: row.name,
    collectionId: row.collectionId ?? undefined,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    request: normalizeRequestPayload(row.data),
  };
}

export function toCollection(row: CollectionRow, requests: SavedRequest[]): Collection {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    requests,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function normalizeRequestPayload(value: unknown): ApiRequest {
  const payload = (value ?? {}) as Partial<ApiRequest>;
  return {
    method: payload.method ?? "GET",
    url: payload.url ?? "",
    headers: payload.headers ?? [],
    params: payload.params ?? [],
    body: payload.body ?? null,
    bodyType: payload.bodyType ?? "none",
    formDataFields: payload.formDataFields ?? [],
    auth: payload.auth ?? { type: "none" },
    preRequestEditorType: payload.preRequestEditorType ?? "visual",
    testEditorType: payload.testEditorType ?? "visual",
    preRequestRules: payload.preRequestRules ?? [],
    testRules: payload.testRules ?? [],
    preRequestScript: payload.preRequestScript ?? "",
    testScript: payload.testScript ?? "",
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
