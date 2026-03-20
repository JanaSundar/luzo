"use client";

import { Loader2 } from "lucide-react";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Collection } from "@/types";

interface CollectionEditorDialogProps {
  collection?: Collection | null;
  onSave: (payload: { id: string; name: string; description?: string }) => Promise<void>;
  trigger: ReactElement;
}

export function CollectionEditorDialog({
  collection,
  onSave,
  trigger,
}: CollectionEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(collection);

  useEffect(() => {
    setName(collection?.name ?? "");
    setDescription(collection?.description ?? "");
  }, [collection]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setIsSaving(true);
    try {
      await onSave({
        id: collection?.id ?? crypto.randomUUID(),
        name: trimmedName,
        description: description.trim() || undefined,
      });
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="text-xl font-bold tracking-tight">
            {isEditing ? "Edit Collection" : "New Collection"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground/80">
            Collections live in your connected database and can be reused from Playground or
            Pipelines to maintain consistent test scenarios.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-8 pt-4">
          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-widest text-primary/60 ml-1">
              Collection Name
            </label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Authentication APIs"
              className="h-11 text-sm focus-visible:ring-primary/20 bg-muted/5 border-border/60"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-widest text-primary/60 ml-1">
              Description
            </label>
            <Textarea
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional: Describe what's inside this collection..."
              className="resize-none text-sm focus-visible:ring-primary/20 leading-relaxed bg-muted/5 border-border/60"
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || isSaving}
              className="px-6 h-10 font-bold transition-all active:scale-95"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing
                ? isSaving
                  ? "Saving Changes..."
                  : "Save Changes"
                : isSaving
                  ? "Creating..."
                  : "Create Collection"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
