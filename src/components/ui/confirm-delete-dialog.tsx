"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DESTRUCTIVE_BUTTON_CLASSES, cn } from "@/lib/utils";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  itemName?: string;
  itemCount?: number;
  skipConfirmTemp: boolean;
  onSkipConfirmChange: (checked: boolean) => void;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "Confirm Delete",
  itemName,
  itemCount = 1,
  skipConfirmTemp,
  onSkipConfirmChange,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const displayName = itemName || (itemCount === 1 ? "this item" : `these ${itemCount} items`);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to delete {displayName}? This action cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="skip-confirm"
              checked={skipConfirmTemp}
              onChange={(e) => onSkipConfirmChange(e.target.checked)}
              disabled={isDeleting}
              className="h-4 w-4 accent-primary rounded border-gray-300 focus:ring-primary"
            />
            <label
              htmlFor="skip-confirm"
              className="text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            >
              Don&apos;t show this again
            </label>
          </div>
        </div>
        <DialogFooter>
          <DialogClose
            render={
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                className="h-8 min-w-28 justify-center"
              >
                Cancel
              </Button>
            }
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleConfirm()}
            disabled={isDeleting}
            className={cn("h-8 min-w-28 justify-center gap-2", DESTRUCTIVE_BUTTON_CLASSES)}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
