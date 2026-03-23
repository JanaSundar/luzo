import { desc, eq, inArray } from "drizzle-orm";
import {
  toCollection,
  toCollectionRequest,
  toSavedRequest,
} from "@/lib/collections/request-mapper";
import type { ApiRequest, ApiResponse, Collection } from "@/types";
import type { DbClient } from "./runtime";
import { collections, requests } from "./schema";

interface UpsertCollectionInput {
  id: string;
  name: string;
  description?: string;
}

interface UpsertRequestInput {
  autoSave?: boolean;
  id: string;
  collectionId: string;
  name: string;
  request: ApiRequest;
  response?: ApiResponse | null;
}

export async function listCollections(client: DbClient): Promise<Collection[]> {
  const collectionRows = await client.db
    .select()
    .from(collections)
    .orderBy(desc(collections.updatedAt), desc(collections.createdAt));

  if (collectionRows.length === 0) {
    return [];
  }

  const collectionIds = collectionRows.map((row) => row.id);
  const requestRows = await client.db
    .select()
    .from(requests)
    .where(inArray(requests.collectionId, collectionIds))
    .orderBy(desc(requests.updatedAt), desc(requests.createdAt));

  const requestsByCollectionId = requestRows.reduce<
    Record<string, ReturnType<typeof toSavedRequest>[]>
  >((accumulator, row) => {
    const savedRequest = toSavedRequest(row);
    const collectionId = savedRequest.collectionId;
    if (!collectionId) return accumulator;
    accumulator[collectionId] = [...(accumulator[collectionId] ?? []), savedRequest];
    return accumulator;
  }, {});

  return collectionRows.map((row) => toCollection(row, requestsByCollectionId[row.id] ?? []));
}

export async function upsertCollection(client: DbClient, input: UpsertCollectionInput) {
  const now = new Date();
  await client.db
    .insert(collections)
    .values({
      id: input.id,
      name: input.name,
      description: input.description?.trim() || null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: collections.id,
      set: {
        name: input.name,
        description: input.description?.trim() || null,
        updatedAt: now,
      },
    });
}

export async function deleteCollection(client: DbClient, collectionId: string) {
  await client.db.delete(collections).where(eq(collections.id, collectionId));
}

export async function upsertRequest(client: DbClient, input: UpsertRequestInput) {
  const now = new Date();
  const existingRow = await client.db.select().from(requests).where(eq(requests.id, input.id));
  const nextData = toCollectionRequest(input.request, {
    response: input.response,
    autoSave: input.autoSave,
    existing: existingRow[0]?.data,
  });
  await client.db
    .insert(requests)
    .values({
      id: input.id,
      collectionId: input.collectionId,
      name: input.name,
      data: nextData,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: requests.id,
      set: {
        collectionId: input.collectionId,
        name: input.name,
        data: nextData,
        updatedAt: now,
      },
    });
}

export async function insertRequestsBulk(client: DbClient, inputs: UpsertRequestInput[]) {
  if (inputs.length === 0) return;
  const now = new Date();
  await client.db.insert(requests).values(
    inputs.map((input) => ({
      id: input.id,
      collectionId: input.collectionId,
      name: input.name,
      data: toCollectionRequest(input.request, {
        response: input.response,
        autoSave: input.autoSave,
      }),
      updatedAt: now,
    })),
  );
}

export async function deleteRequest(client: DbClient, requestId: string) {
  await client.db.delete(requests).where(eq(requests.id, requestId));
}
