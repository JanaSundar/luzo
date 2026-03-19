"use client";

import { Edit3, Folder, FolderOpen, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CollectionEditorDialog } from "@/components/collections/CollectionEditorDialog";
import { CollectionsDisabledState } from "@/components/collections/CollectionsDisabledState";
import { CollectionsHistorySection } from "@/components/collections/CollectionsHistorySection";
import { CollectionsOverview } from "@/components/collections/CollectionsOverview";
import { CollectionsRequestsSection } from "@/components/collections/CollectionsRequestsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkspaceHeader } from "@/components/ui/workspace-header";
import { WorkspacePane } from "@/components/ui/workspace-pane";
import { useCollectionMutations, useCollectionsQuery } from "@/lib/collections/useCollections";
import { useCollectionStore } from "@/lib/stores/useCollectionStore";
import { useDbStore } from "@/lib/stores/useDbStore";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { cn } from "@/lib/utils";
import type { Collection } from "@/types";

export function CollectionsWorkspace() {
  const router = useRouter();
  const history = useCollectionStore((state) => state.history);
  const clearHistory = useCollectionStore((state) => state.clearHistory);
  const { status, schemaReady } = useDbStore();
  const { data: collections = [], isLoading } = useCollectionsQuery();
  const { saveCollection, deleteCollection } = useCollectionMutations();
  const setRequest = usePlaygroundStore((state) => state.setRequest);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selectedCollectionId && collections[0]?.id) {
      setSelectedCollectionId(collections[0].id);
    }
  }, [collections, selectedCollectionId]);

  const canUseCollections = status === "connected" && schemaReady;
  const activeCollection = collections.find((entry) => entry.id === selectedCollectionId) ?? null;
  const filteredCollections = useMemo(
    () =>
      collections.filter((collection) => {
        const haystack = `${collection.name} ${collection.description ?? ""}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    [collections, search]
  );

  const filteredRequests = useMemo(() => {
    if (!activeCollection) return [];
    return activeCollection.requests.filter((request) => {
      const haystack = `${request.name} ${request.request.url}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [activeCollection, search]);
  const totalSavedRequests = collections.reduce(
    (count, collection) => count + collection.requests.length,
    0
  );

  const handleSaveCollection = async (payload: {
    id: string;
    name: string;
    description?: string;
  }) => {
    await saveCollection.mutateAsync(payload);
    setSelectedCollectionId(payload.id);
    toast.success("Collection saved");
  };

  const openInPlayground = (request: Collection["requests"][number]["request"]) => {
    setRequest(request);
    router.push("/");
  };

  if (!canUseCollections) {
    return <CollectionsDisabledState />;
  }

  return (
    <div className="flex h-full w-full min-h-0 flex-1 min-w-0 flex-col gap-3 p-3 pt-2">
      <CollectionsOverview
        collectionsCount={collections.length}
        savedRequestsCount={totalSavedRequests}
        historyCount={history.length}
      />

      <div className="grid flex-1 min-h-0 gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
        <WorkspacePane border>
          <WorkspaceHeader title="Collections Index" icon={Folder} status="database-backed">
            <CollectionEditorDialog
              onSave={handleSaveCollection}
              trigger={
                <Button type="button" size="icon" variant="outline" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              }
            />
          </WorkspaceHeader>

          <div className="space-y-3 border-b border-border/60 p-4">
            <div>
              <p className="text-sm font-semibold">Request Library</p>
              <p className="text-xs text-muted-foreground">
                Curate long-lived requests outside ephemeral history.
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search collections and requests"
                className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-2 p-3">
              {isLoading ? (
                <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading collections...
                </div>
              ) : filteredCollections.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">No collections yet.</p>
              ) : (
                filteredCollections.map((collection) => (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => setSelectedCollectionId(collection.id)}
                    className={cn(
                      "w-full rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-left shadow-sm transition-all",
                      collection.id === selectedCollectionId
                        ? "border-primary/40 bg-primary/5 ring-1 ring-primary/15"
                        : "hover:border-primary/20 hover:bg-accent/20"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{collection.name}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {collection.requests.length}
                      </span>
                    </div>
                    {collection.description && (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {collection.description}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </WorkspacePane>

        <WorkspacePane border>
          <WorkspaceHeader
            title={activeCollection?.name ?? "Collection Workspace"}
            icon={FolderOpen}
            status={
              activeCollection ? `${filteredRequests.length} requests` : "select a collection"
            }
          >
            {activeCollection && (
              <>
                <CollectionEditorDialog
                  collection={activeCollection}
                  onSave={handleSaveCollection}
                  trigger={
                    <Button type="button" variant="outline" size="sm" className="gap-2">
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive"
                  onClick={async () => {
                    await deleteCollection.mutateAsync(activeCollection.id);
                    setSelectedCollectionId(null);
                    toast.success("Collection deleted");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </>
            )}
          </WorkspaceHeader>

          <div className="border-b border-border/60 px-5 py-4">
            <p className="text-sm font-semibold">
              {activeCollection?.name ?? "Select a collection to inspect saved requests"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeCollection?.description ||
                "Use Collections for reusable requests, and use History as a temporary scratchpad."}
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-8 p-5">
              <CollectionsRequestsSection
                activeCollection={activeCollection}
                requests={filteredRequests}
                onOpenRequest={openInPlayground}
              />
              <CollectionsHistorySection
                history={history}
                onClearHistory={clearHistory}
                onOpenRequest={openInPlayground}
              />
            </div>
          </ScrollArea>
        </WorkspacePane>
      </div>
    </div>
  );
}
