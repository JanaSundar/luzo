"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DESTRUCTIVE_BUTTON_CLASSES, cn } from "@/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  /** When true, primary button uses destructive styling (e.g. delete). */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel = "Working...",
  cancelLabel = "Cancel",
  isPending = false,
  destructive,
  onConfirm,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const isBusy = isConfirming || isPending;

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm text-muted-foreground leading-relaxed">{description}</div>
        <DialogFooter>
          <DialogClose
            render={
              <Button
                variant="outline"
                size="sm"
                disabled={isBusy}
                className="h-8 min-w-28 justify-center"
              >
                {cancelLabel}
              </Button>
            }
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleConfirm()}
            disabled={isBusy}
            className={cn(
              "h-8 min-w-28 justify-center",
              destructive && ["gap-2", DESTRUCTIVE_BUTTON_CLASSES],
            )}
          >
            {isBusy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {pendingLabel}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
