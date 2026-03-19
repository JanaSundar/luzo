"use client";

import { FolderPlus } from "lucide-react";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCollectionMutations, useCollectionsQuery } from "@/lib/collections/useCollections";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import type { ApiRequest } from "@/types";

interface SaveToCollectionDialogProps {
  request: ApiRequest;
  defaultName: string;
  trigger?: ReactElement;
}

export function SaveToCollectionDialog({
  request,
  defaultName,
  trigger,
}: SaveToCollectionDialogProps) {
  const { dbStatus: status, dbSchemaReady: schemaReady } = useSettingsStore();
  const { data: collections = [] } = useCollectionsQuery();
  const { saveCollection, saveRequest } = useCollectionMutations();
  const [open, setOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [requestName, setRequestName] = useState(defaultName);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");

  useEffect(() => {
    if (!selectedCollectionId && collections[0]?.id) {
      setSelectedCollectionId(collections[0].id);
    }
  }, [collections, selectedCollectionId]);

  useEffect(() => {
    setRequestName(defaultName);
  }, [defaultName]);

  const canUseCollections = status === "connected" && schemaReady;
  const canSave = canUseCollections && Boolean(selectedCollectionId) && Boolean(requestName.trim());

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) return;

    const id = crypto.randomUUID();
    await saveCollection.mutateAsync({
      id,
      name,
      description: newCollectionDescription.trim() || undefined,
    });
    setSelectedCollectionId(id);
    setNewCollectionName("");
    setNewCollectionDescription("");
    toast.success("Collection created");
  };

  const handleSave = async () => {
    if (!canSave) return;

    const collection = collections.find((c) => c.id === selectedCollectionId);
    const isDuplicate = collection?.requests.some(
      (r) => r.request.url === request.url && r.request.method === request.method
    );

    if (isDuplicate) {
      toast.error("This request already exists in this collection.");
      return;
    }

    await saveRequest.mutateAsync({
      id: crypto.randomUUID(),
      collectionId: selectedCollectionId,
      name: requestName.trim(),
      request,
    });
    toast.success("Saved to collection");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button type="button" variant="outline" size="icon" className="h-9 w-9">
              <FolderPlus className="h-4 w-4" />
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save to Collection</DialogTitle>
          <DialogDescription>
            Store this request in your connected database so it stays editable outside history.
          </DialogDescription>
        </DialogHeader>

        {!canUseCollections ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Connect a database in Settings before saving requests to Collections.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Request name
              </label>
              <Input value={requestName} onChange={(event) => setRequestName(event.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Collection
              </label>
              <Select
                value={selectedCollectionId}
                onValueChange={(value) => setSelectedCollectionId(value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a collection">
                    {collections.find((c) => c.id === selectedCollectionId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                New collection
              </p>
              <Input
                placeholder="Collection name"
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
              />
              <Textarea
                placeholder="Optional description"
                value={newCollectionDescription}
                onChange={(event) => setNewCollectionDescription(event.target.value)}
                rows={3}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleCreateCollection}
                disabled={saveCollection.isPending || !newCollectionName.trim()}
              >
                Create collection
              </Button>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSave}
                disabled={!canSave || saveRequest.isPending}
              >
                Save request
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
