"use client";

import {
  ArrowRight,
  Clock3,
  Edit3,
  Folder,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CollectionEditorDialog } from "@/components/collections/CollectionEditorDialog";
import { CollectionsDisabledState } from "@/components/collections/CollectionsDisabledState";
import { CollectionsHistorySection } from "@/components/collections/CollectionsHistorySection";
import { CollectionsOverview } from "@/components/collections/CollectionsOverview";
import { CollectionsRequestsSection } from "@/components/collections/CollectionsRequestsSection";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkspaceHeader } from "@/components/ui/workspace-header";
import { WorkspacePane } from "@/components/ui/workspace-pane";
import { useCollectionMutations, useCollectionsQuery } from "@/lib/collections/useCollections";
import { useHistoryStore } from "@/lib/stores/useHistoryStore";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import { ACTION_BUTTON_CLASSES, cn } from "@/lib/utils";
import type { Collection } from "@/types";

export function CollectionsWorkspace() {
  const router = useRouter();
  const history = useHistoryStore((state) => state.history);
  const clearHistory = useHistoryStore((state) => state.clearHistory);
  const { dbStatus: status, dbSchemaReady: schemaReady } = useSettingsStore();
  const { data: collections = [], isLoading } = useCollectionsQuery();
  const { saveCollection, deleteCollection } = useCollectionMutations();
  const setRequest = usePlaygroundStore((state) => state.setRequest);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [skipDeleteConfirm, setSkipDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    await deleteCollection.mutateAsync(pendingDeleteId);
    setSelectedCollectionId(null);
    toast.success("Collection deleted");
    if (skipDeleteConfirm) setSkipDeleteConfirm(true);
    setShowDeleteDialog(false);
    setPendingDeleteId(null);
  };

  const handleDeleteClick = () => {
    const id = activeCollection?.id ?? null;
    setPendingDeleteId(id);
    if (skipDeleteConfirm && id) {
      handleConfirmDelete();
    } else {
      setShowDeleteDialog(true);
    }
  };

  const pendingDeleteName = pendingDeleteId
    ? collections.find((c) => c.id === pendingDeleteId)?.name
    : undefined;

  const openInPlayground = (request: Collection["requests"][number]["request"]) => {
    setRequest(request);
    router.push("/");
  };

  if (!canUseCollections) {
    return <CollectionsDisabledState />;
  }

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col gap-3 p-3 pt-2 overflow-hidden">
      <div className="flex-shrink-0">
        <CollectionsOverview
          collectionsCount={collections.length}
          savedRequestsCount={totalSavedRequests}
          historyCount={history.length}
          newCollectionTrigger={
            <CollectionEditorDialog
              onSave={handleSaveCollection}
              trigger={
                <Button type="button" size="sm" className="gap-2 cursor-pointer">
                  New collection
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              }
            />
          }
        />
      </div>

      <div className="grid flex-1 min-h-0 gap-3 overflow-hidden lg:grid-cols-[260px_2fr_1fr]">
        <WorkspacePane border>
          <WorkspaceHeader title="Collections" icon={Folder}>
            <CollectionEditorDialog
              onSave={handleSaveCollection}
              trigger={
                <Button type="button" size="icon" variant="outline" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              }
            />
          </WorkspaceHeader>

          <div className="space-y-3 border-b border-border/60 p-4 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search collections..."
                className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 min-h-0 no-scrollbar">
            <div className="divide-y divide-border/20 px-2">
              {isLoading ? (
                <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
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
                      "w-full py-3 text-left transition-all px-3 relative",
                      collection.id === selectedCollectionId
                        ? "text-primary"
                        : "text-muted-foreground/70 hover:text-foreground"
                    )}
                  >
                    {collection.id === selectedCollectionId && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary" />
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold truncate uppercase tracking-widest text-[11px]">
                        {collection.name}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">
                        {collection.requests.length}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </WorkspacePane>

        <WorkspacePane border>
          <WorkspaceHeader
            title={activeCollection?.name ?? "Requests"}
            icon={FolderOpen}
            status={
              activeCollection ? `${filteredRequests.length} requests` : "select a collection"
            }
          >
            {activeCollection && (
              <div className="flex items-center gap-1.5">
                <CollectionEditorDialog
                  collection={activeCollection}
                  onSave={handleSaveCollection}
                  trigger={
                    <Button type="button" variant="outline" size="sm" className="h-8 gap-2">
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={ACTION_BUTTON_CLASSES}
                  disabled={deleteCollection.isPending}
                  onClick={handleDeleteClick}
                >
                  {deleteCollection.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  {deleteCollection.isPending ? "..." : "Delete"}
                </Button>
              </div>
            )}
          </WorkspaceHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4">
              <CollectionsRequestsSection
                activeCollection={activeCollection}
                requests={filteredRequests}
                onOpenRequest={openInPlayground}
              />
            </div>
          </ScrollArea>
        </WorkspacePane>

        <WorkspacePane border>
          <WorkspaceHeader title="History" icon={Clock3} status={`${history.length} items`}>
            {history.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={ACTION_BUTTON_CLASSES}
                onClick={clearHistory}
              >
                Clear
              </Button>
            )}
          </WorkspaceHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4">
              <CollectionsHistorySection history={history} onOpenRequest={openInPlayground} />
            </div>
          </ScrollArea>
        </WorkspacePane>
      </div>

      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Collection"
        itemName={pendingDeleteName}
        skipConfirmTemp={skipDeleteConfirm}
        onSkipConfirmChange={setSkipDeleteConfirm}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
