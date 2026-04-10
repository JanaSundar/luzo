"use client";

import { Database, Link2, Unlink } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCollectionMutations, useCollectionsQuery } from "@/features/collections/useCollections";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ApiRequest, PipelineRequestSource, PipelineStep } from "@/types";

interface PipelineNodeRequestPickerProps {
  onApplyRequest: (request: ApiRequest, source: PipelineRequestSource) => void;
  onDetach: () => void;
  source?: PipelineRequestSource;
  step: PipelineStep;
}

export function PipelineNodeRequestPicker({
  onApplyRequest,
  onDetach,
  source,
  step,
}: PipelineNodeRequestPickerProps) {
  const { data: collections = [] } = useCollectionsQuery();
  const { saveRequest } = useCollectionMutations();
  const dbStatus = useSettingsStore((state) => state.dbStatus);
  const dbSchemaReady = useSettingsStore((state) => state.dbSchemaReady);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState(source?.collectionId ?? "");
  const [selectedRequestId, setSelectedRequestId] = useState(source?.requestId ?? "");
  const canUseCollections = dbStatus === "connected" && dbSchemaReady;

  const filteredCollections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return collections;
    return collections
      .map((collection) => ({
        ...collection,
        requests: collection.requests.filter(
          (request) =>
            request.name.toLowerCase().includes(q) || request.request.url.toLowerCase().includes(q),
        ),
      }))
      .filter(
        (collection) => collection.name.toLowerCase().includes(q) || collection.requests.length > 0,
      );
  }, [collections, search]);

  const selectedCollection =
    filteredCollections.find((collection) => collection.id === selectedCollectionId) ?? null;
  const selectedRequest =
    selectedCollection?.requests.find((request) => request.id === selectedRequestId) ?? null;

  const handleApply = () => {
    if (!selectedCollection || !selectedRequest) return;
    onApplyRequest(selectedRequest.request, {
      mode: "linked",
      collectionId: selectedCollection.id,
      requestId: selectedRequest.id,
      requestName: selectedRequest.name,
    });
    setOpen(false);
  };

  const handleSync = async () => {
    if (!source?.collectionId || !source.requestId || source.mode !== "linked") return;
    await saveRequest.mutateAsync({
      id: source.requestId,
      collectionId: source.collectionId,
      name: step.name,
      request: step,
      response: undefined,
      autoSave: false,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button type="button" size="sm" variant="outline" className="gap-2">
              <Database className="h-3.5 w-3.5" />
              {source?.mode === "linked" ? "Swap linked request" : "Use collection request"}
            </Button>
          }
        />
        <DialogContent className="flex max-h-[min(84dvh,760px)] flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Choose a request from a collection</DialogTitle>
            <DialogDescription>
              Seed this node from an existing saved request. Linked requests stay editable in the
              node and sync only when you explicitly push changes.
            </DialogDescription>
          </DialogHeader>

          {!canUseCollections ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              Connect a database in settings to browse collections here.
            </div>
          ) : (
            <>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search collections or requests"
              />
              <div className="grid min-h-0 flex-1 gap-4 overflow-hidden md:grid-cols-[240px_minmax(0,1fr)_320px]">
                <ScrollArea className="rounded-2xl border border-border/50 bg-muted/10">
                  <div className="space-y-1 p-2">
                    {filteredCollections.map((collection) => (
                      <button
                        key={collection.id}
                        type="button"
                        className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                          selectedCollectionId === collection.id
                            ? "bg-background shadow-sm"
                            : "hover:bg-background/60"
                        }`}
                        onClick={() => {
                          setSelectedCollectionId(collection.id);
                          setSelectedRequestId(collection.requests[0]?.id ?? "");
                        }}
                      >
                        <div className="font-semibold">{collection.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {collection.requests.length} request
                          {collection.requests.length === 1 ? "" : "s"}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>

                <ScrollArea className="rounded-2xl border border-border/50 bg-background">
                  <div className="space-y-2 p-3">
                    {(selectedCollection?.requests ?? []).map((request) => (
                      <button
                        key={request.id}
                        type="button"
                        className={`w-full rounded-2xl border px-3 py-3 text-left ${
                          selectedRequestId === request.id
                            ? "border-foreground/30 bg-muted/15"
                            : "border-border/50 hover:bg-muted/10"
                        }`}
                        onClick={() => setSelectedRequestId(request.id)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="truncate font-semibold">{request.name}</div>
                          <div className="rounded-full border border-border/60 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
                            {request.request.method}
                          </div>
                        </div>
                        <div className="mt-2 truncate font-mono text-[11px] text-muted-foreground">
                          {request.request.url}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>

                <div className="min-h-0 rounded-2xl border border-border/50 bg-muted/10 p-4">
                  {selectedRequest ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                          Preview
                        </div>
                        <div className="mt-2 text-lg font-semibold">{selectedRequest.name}</div>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-background px-3 py-3">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                          Endpoint
                        </div>
                        <div className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
                          {selectedRequest.request.url}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div className="rounded-xl border border-border/50 bg-background px-3 py-2">
                          {selectedRequest.request.headers.length} headers
                        </div>
                        <div className="rounded-xl border border-border/50 bg-background px-3 py-2">
                          {selectedRequest.request.params.length} params
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Pick a request to preview it here.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={!selectedRequest || !canUseCollections}
            >
              Use request in node
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {source?.mode === "linked" ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => void handleSync()}
          >
            <Link2 className="h-3.5 w-3.5" />
            Push sync
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-2" onClick={onDetach}>
            <Unlink className="h-3.5 w-3.5" />
            Detach
          </Button>
        </>
      ) : null}
    </div>
  );
}
