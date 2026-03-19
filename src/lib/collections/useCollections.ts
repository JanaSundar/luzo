"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCollections,
  removeCollection,
  removeCollectionRequest,
  saveCollection,
  saveCollectionRequest,
} from "@/lib/collections/api";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import type { ApiRequest } from "@/types";

const COLLECTIONS_QUERY_KEY = ["collections"] as const;

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

  const invalidateCollections = () =>
    queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });

  return {
    saveCollection: useMutation({
      mutationFn: (payload: { id: string; name: string; description?: string }) =>
        saveCollection(dbUrl, payload),
      onSuccess: invalidateCollections,
    }),
    saveRequest: useMutation({
      mutationFn: (payload: {
        id: string;
        collectionId: string;
        name: string;
        request: ApiRequest;
      }) => saveCollectionRequest(dbUrl, payload),
      onSuccess: invalidateCollections,
    }),
    deleteCollection: useMutation({
      mutationFn: (id: string) => removeCollection(dbUrl, id),
      onSuccess: invalidateCollections,
    }),
    deleteRequest: useMutation({
      mutationFn: (id: string) => removeCollectionRequest(dbUrl, id),
      onSuccess: invalidateCollections,
    }),
  };
}
