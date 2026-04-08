"use client";

import { FolderPlus, Loader2 } from "lucide-react";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useCollectionMutations, useCollectionsQuery } from "@/features/collections/useCollections";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ApiRequest, ApiResponse } from "@/types";
import {
  CollectionsUnavailableState,
  NewCollectionSection,
} from "./SaveToCollectionDialogSections";

interface SaveToCollectionDialogProps {
  request: ApiRequest;
  response?: ApiResponse | null;
  defaultName: string;
  trigger?: ReactElement;
}

export function SaveToCollectionDialog({
  request,
  response = null,
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
  const [autoSave, setAutoSave] = useState(false);

  useEffect(() => {
    if (!selectedCollectionId && collections[0]?.id) {
      setSelectedCollectionId(collections[0].id);
    }
  }, [collections, selectedCollectionId]);

  useEffect(() => {
    setRequestName(defaultName);
  }, [defaultName]);

  useEffect(() => {
    if (!open) return;
    setAutoSave(false);
  }, [open]);

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
      (r) => r.request.url === request.url && r.request.method === request.method,
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
      response: response ?? undefined,
      autoSave,
    });
    if (!autoSave) {
      toast.success("Saved to collection");
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              title="Save to Collection"
            >
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
          <CollectionsUnavailableState
            onOpenSettings={() => {
              setOpen(false);
              window.location.href = "/settings";
            }}
          />
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

            <NewCollectionSection
              name={newCollectionName}
              description={newCollectionDescription}
              isPending={saveCollection.isPending}
              onNameChange={setNewCollectionName}
              onDescriptionChange={setNewCollectionDescription}
              onCreate={() => void handleCreateCollection()}
            />

            <div className="space-y-3 rounded-xl border p-4">
              <div className="rounded-lg bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
                {response
                  ? "Latest response will be saved automatically with this request."
                  : "No response yet. The request will be saved now, and future saves will include a response automatically when one exists."}
              </div>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(event) => setAutoSave(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <span>
                  <span className="block text-sm font-medium">Enable auto-save</span>
                  <span className="block text-xs text-muted-foreground">
                    Debounced sync for future edits after you open this request from the collection.
                  </span>
                </span>
              </label>
            </div>

            <DialogFooter className="gap-2">
              <DialogClose
                render={
                  <Button type="button" variant="outline" className="min-w-28 justify-center">
                    Cancel
                  </Button>
                }
              />
              <Button
                type="button"
                className="min-w-32 justify-center"
                onClick={handleSave}
                disabled={!canSave || saveRequest.isPending}
              >
                {saveRequest.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save request"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
