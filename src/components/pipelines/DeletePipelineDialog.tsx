"use client";

import { useEffect, useState } from "react";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { usePipelineExecutionStore } from "@/lib/stores/usePipelineExecutionStore";

interface DeletePipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingDeleteIds: string[];
  skipConfirmTemp: boolean;
  onSkipConfirmChange: (checked: boolean) => void;
  onConfirm: () => void;
}

export function DeletePipelineDialog({
  open,
  onOpenChange,
  pendingDeleteIds,
  skipConfirmTemp,
  onSkipConfirmChange,
  onConfirm,
}: DeletePipelineDialogProps) {
  const [skip, setSkip] = useState(skipConfirmTemp);
  const resetSession = usePipelineExecutionStore((s) => s.reset);

  useEffect(() => {
    setSkip(skipConfirmTemp);
  }, [skipConfirmTemp]);

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm Delete"
      itemCount={pendingDeleteIds.length}
      skipConfirmTemp={skip}
      onSkipConfirmChange={setSkip}
      onConfirm={() => {
        resetSession();
        onConfirm();
        if (skip) {
          onSkipConfirmChange(true);
        }
      }}
    />
  );
}
