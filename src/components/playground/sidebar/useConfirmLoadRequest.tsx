"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useExecutionStore } from "@/stores/useExecutionStore";
import { usePlaygroundStore } from "@/stores/usePlaygroundStore";
import type { ApiRequest, SavedRequest } from "@/types";

export function useConfirmLoadRequest() {
  const currentRequest = usePlaygroundStore((s) => s.request);
  const originalRequest = usePlaygroundStore((s) => s.originalRequest);
  const setLoadedRequest = usePlaygroundStore((s) => s.setLoadedRequest);
  const setPlaygroundResponse = useExecutionStore((s) => s.setPlaygroundResponse);

  const [pending, setPending] = useState<{
    request: SavedRequest | ApiRequest;
    name: string;
  } | null>(null);

  const loadRequest = useCallback(
    (request: SavedRequest | ApiRequest, name: string) => {
      const isDirty =
        originalRequest !== null &&
        JSON.stringify(currentRequest) !== JSON.stringify(originalRequest);

      if (isDirty) {
        setPending({ request, name });
        return;
      }
      setLoadedRequest(request);
      setPlaygroundResponse("response" in request ? (request.response ?? null) : null);
      toast.success(`Loaded: ${name}`);
    },
    [currentRequest, originalRequest, setLoadedRequest, setPlaygroundResponse],
  );

  const handleConfirmPending = useCallback(() => {
    if (!pending) return;
    setLoadedRequest(pending.request);
    setPlaygroundResponse(
      "response" in pending.request ? (pending.request.response ?? null) : null,
    );
    toast.success(`Loaded: ${pending.name}`);
    setPending(null);
  }, [pending, setLoadedRequest, setPlaygroundResponse]);

  const loadRequestConfirmDialog = (
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) setPending(null);
      }}
      title="Unsaved changes"
      description="You have unsaved changes. Are you sure you want to load another request? Your current edits will be lost."
      confirmLabel="Load request"
      onConfirm={handleConfirmPending}
    />
  );

  return { loadRequest, loadRequestConfirmDialog };
}
