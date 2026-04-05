"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCollections,
  removeCollection,
  removeCollectionRequest,
  saveCollection,
  saveCollectionRequest,
  saveCollectionRequestsBulk,
} from "@/lib/collections/api";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import type { ApiRequest, ApiResponse, Collection } from "@/types";

const COLLECTIONS_QUERY_KEY = ["collections"] as const;

function updateCollectionsCache(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (collections: Collection[]) => Collection[],
) {
  queryClient.setQueriesData<Collection[] | undefined>(
    { queryKey: COLLECTIONS_QUERY_KEY },
    (existing) => (existing ? updater(existing) : existing),
  );
}

export function useCollectionsQuery() {
  const dbUrl = useSettingsStore((state) => state.dbUrl);
  const dbStatus = useSettingsStore((state) => state.dbStatus);
  const dbSchemaReady = useSettingsStore((state) => state.dbSchemaReady);

  return useQuery({
    queryKey: [...COLLECTIONS_QUERY_KEY, dbUrl],
    queryFn: () => fetchCollections(dbUrl),
    enabled: dbStatus === "connected" && dbSchemaReady && Boolean(dbUrl.trim()),
  });
}

export function useCollectionMutations() {
  const dbUrl = useSettingsStore((state) => state.dbUrl);
  const queryClient = useQueryClient();

  return {
    saveCollection: useMutation({
      mutationFn: (payload: { id: string; name: string; description?: string }) =>
        saveCollection(dbUrl, payload),
      onSuccess: (_result, payload) => {
        updateCollectionsCache(queryClient, (collections) => {
          const existing = collections.find((collection) => collection.id === payload.id);
          if (!existing) {
            return [
              {
                id: payload.id,
                name: payload.name,
                description: payload.description,
                requests: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              ...collections,
            ];
          }
          return collections.map((collection) =>
            collection.id === payload.id
              ? { ...collection, name: payload.name, description: payload.description }
              : collection,
          );
        });
      },
    }),
    saveRequest: useMutation({
      mutationFn: (payload: {
        autoSave?: boolean;
        id: string;
        collectionId: string;
        name: string;
        persistResponse?: boolean;
        request: ApiRequest;
        response?: ApiResponse | null;
      }) => saveCollectionRequest(dbUrl, payload),
      onSuccess: (_result, payload) => {
        updateCollectionsCache(queryClient, (collections) =>
          collections.map((collection) => {
            if (collection.id !== payload.collectionId) return collection;
            const nextRequest = {
              id: payload.id,
              name: payload.name,
              request: payload.request,
              response: payload.persistResponse ? (payload.response ?? null) : null,
              collectionId: payload.collectionId,
              persistResponse: payload.persistResponse ?? false,
              autoSave: payload.autoSave ?? false,
              createdAt:
                collection.requests.find((request) => request.id === payload.id)?.createdAt ??
                new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            const withoutCurrent = collection.requests.filter(
              (request) => request.id !== payload.id,
            );
            return {
              ...collection,
              requests: [nextRequest, ...withoutCurrent],
              updatedAt: nextRequest.updatedAt,
            };
          }),
        );
      },
    }),
    saveRequestsBulk: useMutation({
      mutationFn: (payload: {
        collectionId: string;
        requests: Array<{
          autoSave?: boolean;
          id: string;
          collectionId: string;
          name: string;
          request: ApiRequest;
          response?: ApiResponse | null;
        }>;
      }) => saveCollectionRequestsBulk(dbUrl, payload),
      onSuccess: (_result, payload) => {
        const now = new Date().toISOString();
        updateCollectionsCache(queryClient, (collections) =>
          collections.map((collection) =>
            collection.id !== payload.collectionId
              ? collection
              : {
                  ...collection,
                  requests: [
                    ...payload.requests.map((request) => ({
                      id: request.id,
                      name: request.name,
                      request: request.request,
                      response: request.response ?? null,
                      collectionId: request.collectionId,
                      persistResponse: Boolean(request.response),
                      autoSave: request.autoSave ?? false,
                      createdAt: now,
                      updatedAt: now,
                    })),
                    ...collection.requests,
                  ],
                  updatedAt: now,
                },
          ),
        );
      },
    }),
    deleteCollection: useMutation({
      mutationFn: (id: string) => removeCollection(dbUrl, id),
      onSuccess: (_result, id) => {
        updateCollectionsCache(queryClient, (collections) =>
          collections.filter((collection) => collection.id !== id),
        );
      },
    }),
    deleteRequest: useMutation({
      mutationFn: (id: string) => removeCollectionRequest(dbUrl, id),
      onSuccess: (_result, id) => {
        updateCollectionsCache(queryClient, (collections) =>
          collections.map((collection) => ({
            ...collection,
            requests: collection.requests.filter((request) => request.id !== id),
          })),
        );
      },
    }),
  };
}
