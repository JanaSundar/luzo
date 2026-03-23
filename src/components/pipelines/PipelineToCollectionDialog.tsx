"use client";

import { FolderPlus, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useCollectionMutations, useCollectionsQuery } from "@/lib/collections/useCollections";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import type { ApiRequest, Pipeline, PipelineStep } from "@/types";

function toApiRequest(step: PipelineStep): ApiRequest {
  const { id: _id, name: _name, ...request } = step;
  return request;
}

function buildSignature(name: string, request: ApiRequest) {
  return `${name}::${request.method}::${request.url}`;
}

export function PipelineToCollectionDialog({ pipeline }: { pipeline: Pipeline }) {
  const { dbStatus, dbSchemaReady } = useSettingsStore();
  const { data: collections = [] } = useCollectionsQuery();
  const { saveCollection, saveRequestsBulk } = useCollectionMutations();
  const [open, setOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [newCollectionName, setNewCollectionName] = useState(pipeline.name);
  const [newCollectionDescription, setNewCollectionDescription] = useState(
    pipeline.description ?? "",
  );
  const canUseCollections = dbStatus === "connected" && dbSchemaReady;

  useEffect(() => {
    if (!selectedCollectionId && collections[0]?.id) setSelectedCollectionId(collections[0].id);
  }, [collections, selectedCollectionId]);

  useEffect(() => {
    if (!open) return;
    setNewCollectionName(pipeline.name);
    setNewCollectionDescription(pipeline.description ?? "");
  }, [open, pipeline.description, pipeline.name]);

  const selectedCollection = useMemo(
    () => collections.find((collection) => collection.id === selectedCollectionId) ?? null,
    [collections, selectedCollectionId],
  );

  const saveSteps = async (collectionId: string) => {
    const existing = new Set(
      (selectedCollection?.requests ?? []).map((request) =>
        buildSignature(request.name, request.request),
      ),
    );
    const requests = pipeline.steps.flatMap((step) => {
      const request = toApiRequest(step);
      const signature = buildSignature(step.name, request);
      if (existing.has(signature)) return [];
      existing.add(signature);
      return [{ id: crypto.randomUUID(), collectionId, name: step.name, request }];
    });
    if (requests.length === 0) {
      toast.error("All pipeline requests already exist in that collection.");
      return;
    }
    await saveRequestsBulk.mutateAsync({ collectionId, requests });
    toast.success(
      requests.length === pipeline.steps.length
        ? "Pipeline saved to collection"
        : `${requests.length} new requests saved from this pipeline`,
    );
    setOpen(false);
  };

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
    await saveRequestsBulk.mutateAsync({
      collectionId: id,
      requests: pipeline.steps.map((step) => ({
        id: crypto.randomUUID(),
        collectionId: id,
        name: step.name,
        request: toApiRequest(step),
      })),
    });
    toast.success("Pipeline saved to a new collection");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" className="h-9 gap-2">
            <FolderPlus className="h-4 w-4" />
            Save as collection
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save Pipeline to Collection</DialogTitle>
          <DialogDescription>
            Store all pipeline requests in a DB-backed collection so they stay reusable outside the
            builder.
          </DialogDescription>
        </DialogHeader>

        {!canUseCollections ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/5 p-4 text-sm text-muted-foreground">
            Connect your database in settings to save pipelines as collections.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Existing collection
              </label>
              <Select
                value={selectedCollectionId}
                onValueChange={(value) => setSelectedCollectionId(value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a collection">
                    {selectedCollection?.name}
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
              <Button
                type="button"
                variant="secondary"
                className="min-w-40 justify-center"
                disabled={!selectedCollectionId || saveRequestsBulk.isPending}
                onClick={() => void saveSteps(selectedCollectionId)}
              >
                {saveRequestsBulk.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add requests
              </Button>
            </div>

            <div className="rounded-xl border p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                New collection
              </p>
              <Input
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
                placeholder="Collection name"
              />
              <Textarea
                rows={3}
                value={newCollectionDescription}
                onChange={(event) => setNewCollectionDescription(event.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>
        )}

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
            className="min-w-36 justify-center"
            disabled={
              !canUseCollections ||
              !newCollectionName.trim() ||
              saveCollection.isPending ||
              saveRequestsBulk.isPending
            }
            onClick={() => void handleCreateCollection()}
          >
            {saveCollection.isPending || saveRequestsBulk.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Create collection"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
