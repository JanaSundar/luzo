"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCollections,
  removeCollection,
  removeCollectionRequest,
  saveCollection,
  saveCollectionRequest,
} from "@/lib/collections/api";
import { useDbStore } from "@/lib/stores/useDbStore";
import type { ApiRequest } from "@/types";

const COLLECTIONS_QUERY_KEY = ["collections"] as const;

export function useCollectionsQuery() {
  const dbUrl = useDbStore((state) => state.dbUrl);
  const status = useDbStore((state) => state.status);
  const schemaReady = useDbStore((state) => state.schemaReady);

  return useQuery({
    queryKey: [...COLLECTIONS_QUERY_KEY, dbUrl],
    queryFn: () => fetchCollections(dbUrl),
    enabled: status === "connected" && schemaReady && Boolean(dbUrl.trim()),
  });
}

export function useCollectionMutations() {
  const dbUrl = useDbStore((state) => state.dbUrl);
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
