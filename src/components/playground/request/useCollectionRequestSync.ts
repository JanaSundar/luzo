"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useCollectionMutations } from "@/lib/collections/useCollections";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import type { ApiRequest, ApiResponse } from "@/types";

const AUTO_SAVE_DELAY_MS = 1500;

export function useCollectionRequestSync(request: ApiRequest, response: ApiResponse | null) {
  const linkedSavedRequest = usePlaygroundStore((state) => state.linkedSavedRequest);
  const setLinkedSavedRequest = usePlaygroundStore((state) => state.setLinkedSavedRequest);
  const markRequestPersisted = usePlaygroundStore((state) => state.markRequestPersisted);
  const { dbStatus, dbSchemaReady } = useSettingsStore();
  const { saveRequest } = useCollectionMutations();
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const lastSavedFingerprintRef = useRef<string>("");

  const canSync = dbStatus === "connected" && dbSchemaReady && Boolean(linkedSavedRequest);
  const fingerprint = useMemo(
    () =>
      linkedSavedRequest
        ? JSON.stringify({
            request,
            autoSave: linkedSavedRequest.autoSave,
            hasResponse: Boolean(response),
          })
        : "",
    [linkedSavedRequest, request, response],
  );
  const isDirty = Boolean(linkedSavedRequest) && fingerprint !== lastSavedFingerprintRef.current;

  useEffect(() => {
    if (linkedSavedRequest) {
      lastSavedFingerprintRef.current = JSON.stringify({
        request,
        autoSave: linkedSavedRequest.autoSave,
        hasResponse: Boolean(response),
      });
    }
    // initialize only when a different saved request is loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedSavedRequest?.id]);

  const saveNow = useCallback(
    async (reason: "manual" | "auto") => {
      if (!linkedSavedRequest || !canSync) return;
      await saveRequest.mutateAsync({
        id: linkedSavedRequest.id,
        collectionId: linkedSavedRequest.collectionId,
        name: linkedSavedRequest.name,
        request,
        response: response ?? undefined,
        autoSave: linkedSavedRequest.autoSave,
      });
      lastSavedFingerprintRef.current = fingerprint;
      markRequestPersisted(request);
      setLastSavedAt(new Date().toISOString());
      if (reason === "manual" && !linkedSavedRequest.autoSave) {
        toast.success("Collection request saved");
      }
    },
    [
      canSync,
      fingerprint,
      linkedSavedRequest,
      markRequestPersisted,
      request,
      response,
      saveRequest,
    ],
  );

  useEffect(() => {
    if (!linkedSavedRequest?.autoSave || !canSync || !isDirty) return;
    const timer = window.setTimeout(() => {
      void saveNow("auto");
    }, AUTO_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [canSync, isDirty, linkedSavedRequest?.autoSave, saveNow]);

  const updateSyncPreference = useCallback(
    (updates: Partial<NonNullable<typeof linkedSavedRequest>>) => {
      if (!linkedSavedRequest) return;
      setLinkedSavedRequest({ ...linkedSavedRequest, ...updates });
    },
    [linkedSavedRequest, setLinkedSavedRequest],
  );

  return {
    autoSave: linkedSavedRequest?.autoSave ?? false,
    canSync,
    isDirty,
    isLinked: Boolean(linkedSavedRequest),
    isSaving: saveRequest.isPending,
    lastSavedAt,
    saveNow,
    setAutoSave: (autoSave: boolean) => updateSyncPreference({ autoSave }),
  };
}
