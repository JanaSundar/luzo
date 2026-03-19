import type { ApiRequest, Collection } from "@/types";

interface CollectionPayload {
  id: string;
  name: string;
  description?: string;
}

interface RequestPayload {
  id: string;
  collectionId: string;
  name: string;
  request: ApiRequest;
}

export async function fetchCollections(dbUrl: string): Promise<Collection[]> {
  const data = await postCollectionsRequest<{ collections: Collection[] }>(dbUrl, {
    action: "list-collections",
  });
  return data.collections;
}

export async function saveCollection(dbUrl: string, payload: CollectionPayload) {
  return postCollectionsRequest(dbUrl, { action: "save-collection", ...payload });
}

export async function saveCollectionRequest(dbUrl: string, payload: RequestPayload) {
  return postCollectionsRequest(dbUrl, { action: "save-request", ...payload });
}

export async function removeCollection(dbUrl: string, id: string) {
  return postCollectionsRequest(dbUrl, { action: "delete-collection", id });
}

export async function removeCollectionRequest(dbUrl: string, id: string) {
  return postCollectionsRequest(dbUrl, { action: "delete-request", id });
}

async function postCollectionsRequest<T = { ok: boolean }>(
  dbUrl: string,
  payload: Record<string, unknown>
): Promise<T> {
  const response = await fetch("/api/db/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dbUrl, ...payload }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Collections request failed");
  }
  return data as T;
}
