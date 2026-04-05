"use client";

import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

interface DeletePipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingDeleteIds: string[];
  onConfirm: () => Promise<void>;
}

export function DeletePipelineDialog({
  open,
  onOpenChange,
  pendingDeleteIds,
  onConfirm,
}: DeletePipelineDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm Delete"
      itemCount={pendingDeleteIds.length}
      onConfirm={onConfirm}
    />
  );
}
