"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to delete{" "}
            {pendingDeleteIds.length === 1
              ? "this pipeline"
              : `these ${pendingDeleteIds.length} pipelines`}
            ? This action cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="skip-confirm"
              checked={skipConfirmTemp}
              onChange={(e) => onSkipConfirmChange(e.target.checked)}
              className="h-4 w-4 accent-primary rounded border-gray-300 focus:ring-primary"
            />
            <label
              htmlFor="skip-confirm"
              className="text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            >
              Don't show this again
            </label>
          </div>
        </div>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            }
          />
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            className="font-bold uppercase tracking-widest text-[9px]"
          >
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
