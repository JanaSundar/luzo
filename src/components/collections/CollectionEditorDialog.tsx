"use client";

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
  const isEditing = Boolean(collection);

  useEffect(() => {
    setName(collection?.name ?? "");
    setDescription(collection?.description ?? "");
  }, [collection]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    await onSave({
      id: collection?.id ?? crypto.randomUUID(),
      name: trimmedName,
      description: description.trim() || undefined,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Collection" : "New Collection"}</DialogTitle>
          <DialogDescription>
            Collections live in your connected database and can be reused from Playground or
            Pipelines.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Name
            </label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Description
            </label>
            <Textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={handleSave} disabled={!name.trim()}>
              {isEditing ? "Save changes" : "Create collection"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
