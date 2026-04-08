"use client";

import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";

interface DeletePipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingDeleteIds: string[];
  onConfirm: () => void;
}

export function DeletePipelineDialog({
  open,
  onOpenChange,
  pendingDeleteIds,
  onConfirm,
}: DeletePipelineDialogProps) {
  const resetSession = usePipelineExecutionStore((s) => s.reset);

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm Delete"
      itemCount={pendingDeleteIds.length}
      onConfirm={() => {
        resetSession();
        onConfirm();
      }}
    />
  );
}
