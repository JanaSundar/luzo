import type { ApiRequest, ApiResponse, Collection, PipelineStep, SavedRequest } from "@/types";

type PersistedRequest = Omit<ApiRequest, "formDataFields"> & {
  formDataFields?: Array<Omit<NonNullable<ApiRequest["formDataFields"]>[number], "file">>;
};

type StoredRequestPayload = {
  autoSave?: boolean;
  persistResponse?: boolean;
  request: PersistedRequest;
  response?: ApiResponse | null;
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

export function toCollectionRequest(
  source: ApiRequest | PipelineStep,
  options?: {
    autoSave?: boolean;
    existing?: unknown;
    response?: ApiResponse | null;
  },
): StoredRequestPayload {
  const existing = normalizeStoredRequestPayload(options?.existing);
  const nextResponse =
    options?.response === undefined ? existing.response : (options.response ?? null);
  return {
    request: {
      ...source,
      formDataFields: source.formDataFields?.map(({ file: _, ...field }) => field),
    },
    response: nextResponse,
    persistResponse: nextResponse !== null,
    autoSave: options?.autoSave ?? false,
  };
}

export function toSavedRequest(row: RequestRow): SavedRequest {
  return {
    id: row.id,
    name: row.name,
    collectionId: row.collectionId ?? undefined,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    ...normalizeStoredRequestPayload(row.data),
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

function normalizeStoredRequestPayload(
  value: unknown,
): Pick<SavedRequest, "request" | "response" | "persistResponse" | "autoSave"> {
  const payload = (value ?? {}) as Partial<StoredRequestPayload & ApiRequest>;
  const requestPayload =
    payload.request && typeof payload.request === "object" ? payload.request : payload;
  return {
    request: normalizeRequestPayload(requestPayload),
    response: isApiResponseLike(payload.response) ? payload.response : null,
    persistResponse: payload.persistResponse ?? false,
    autoSave: payload.autoSave ?? false,
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
    postRequestEditorType: payload.postRequestEditorType ?? "visual",
    testEditorType: payload.testEditorType ?? "visual",
    preRequestRules: payload.preRequestRules ?? [],
    postRequestRules: payload.postRequestRules ?? [],
    testRules: payload.testRules ?? [],
    preRequestScript: payload.preRequestScript ?? "",
    postRequestScript: payload.postRequestScript ?? "",
    testScript: payload.testScript ?? "",
  };
}

function isApiResponseLike(value: unknown): value is ApiResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const response = value as Partial<ApiResponse>;
  return (
    typeof response.status === "number" &&
    typeof response.statusText === "string" &&
    typeof response.body === "string" &&
    typeof response.time === "number" &&
    typeof response.size === "number" &&
    !!response.headers &&
    typeof response.headers === "object"
  );
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
