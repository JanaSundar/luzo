"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import type { ApiRequest } from "@/types";

export function useConfirmLoadRequest() {
  const currentRequest = usePlaygroundStore((s) => s.request);
  const originalRequest = usePlaygroundStore((s) => s.originalRequest);
  const setLoadedRequest = usePlaygroundStore((s) => s.setLoadedRequest);

  const [pending, setPending] = useState<{ request: ApiRequest; name: string } | null>(null);

  const loadRequest = useCallback(
    (request: ApiRequest, name: string) => {
      const isDirty =
        originalRequest !== null &&
        JSON.stringify(currentRequest) !== JSON.stringify(originalRequest);

      if (isDirty) {
        setPending({ request, name });
        return;
      }
      setLoadedRequest(request);
      toast.success(`Loaded: ${name}`);
    },
    [currentRequest, originalRequest, setLoadedRequest]
  );

  const handleConfirmPending = useCallback(() => {
    if (!pending) return;
    setLoadedRequest(pending.request);
    toast.success(`Loaded: ${pending.name}`);
    setPending(null);
  }, [pending, setLoadedRequest]);

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
