"use client";

import { ArrowRight, Edit3, FolderOpen, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CollectionEditorDialog } from "@/components/collections/CollectionEditorDialog";
import { CollectionExportMenu } from "@/components/collections/CollectionExportMenu";
import { CollectionsDisabledState } from "@/components/collections/CollectionsDisabledState";
import { CollectionsHistoryPane } from "@/components/collections/CollectionsHistoryPane";
import { CollectionsOverview } from "@/components/collections/CollectionsOverview";
import { CollectionsRequestsSection } from "@/components/collections/CollectionsRequestsSection";
import { CollectionsSidebarPane } from "@/components/collections/CollectionsSidebarPane";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkspaceHeader } from "@/components/ui/workspace-header";
import { WorkspacePane } from "@/components/ui/workspace-pane";
import { useCollectionMutations, useCollectionsQuery } from "@/features/collections/useCollections";
import { sortSavedRequestsByRecencyDesc } from "@/features/history/sortSavedRequests";
import { collectionToPipelineHref } from "@/features/pipeline/collectionToPipelineHref";
import { useExecutionStore } from "@/stores/useExecutionStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { usePlaygroundStore } from "@/stores/usePlaygroundStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

import { cn, DESTRUCTIVE_BUTTON_CLASSES } from "@/utils";
import type { Collection } from "@/types";

export function CollectionsWorkspace() {
  const router = useRouter();
  const history = useHistoryStore((state) => state.history);
  const clearHistory = useHistoryStore((state) => state.clearHistory);
  const { dbStatus: status, dbSchemaReady: schemaReady } = useSettingsStore();
  const { data: collections = [], isLoading } = useCollectionsQuery();
  const { saveCollection, deleteCollection } = useCollectionMutations();
  const setLoadedRequest = usePlaygroundStore((state) => state.setLoadedRequest);
  const setPlaygroundResponse = useExecutionStore((state) => state.setPlaygroundResponse);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
    [collections, search],
  );

  const filteredRequests = useMemo(() => {
    if (!activeCollection) return [];
    return activeCollection.requests.filter((request) => {
      const haystack = `${request.name} ${request.request.url}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [activeCollection, search]);

  const historySortedByDate = useMemo(() => sortSavedRequestsByRecencyDesc(history), [history]);
  const totalSavedRequests = collections.reduce(
    (count, collection) => count + collection.requests.length,
    0,
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
    setShowDeleteDialog(false);
    setPendingDeleteId(null);
  };

  const handleDeleteClick = () => {
    const id = activeCollection?.id ?? null;
    setPendingDeleteId(id);
    setShowDeleteDialog(true);
  };

  const pendingDeleteName = pendingDeleteId
    ? collections.find((c) => c.id === pendingDeleteId)?.name
    : undefined;

  const openInPlayground = (savedRequest: Collection["requests"][number]) => {
    setLoadedRequest(savedRequest);
    setPlaygroundResponse(savedRequest.response ?? null);
    router.push("/");
  };

  const openHistoryInPlayground = (request: Collection["requests"][number]["request"]) => {
    setLoadedRequest(request);
    setPlaygroundResponse(null);
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
        <CollectionsSidebarPane
          collections={filteredCollections}
          isLoading={isLoading}
          onCreateCollection={handleSaveCollection}
          onImportCollection={setSelectedCollectionId}
          search={search}
          selectedCollectionId={selectedCollectionId}
          setSearch={setSearch}
          setSelectedCollectionId={setSelectedCollectionId}
        />

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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2"
                  onClick={() => router.push(collectionToPipelineHref(activeCollection.id))}
                >
                  Convert
                </Button>
                <CollectionExportMenu collection={activeCollection} />
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
                  className={cn("h-8 gap-2", DESTRUCTIVE_BUTTON_CLASSES)}
                  disabled={deleteCollection.isPending}
                  onClick={handleDeleteClick}
                >
                  {deleteCollection.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  {deleteCollection.isPending ? "Deleting..." : "Delete"}
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

        <CollectionsHistoryPane
          history={historySortedByDate}
          historyCount={history.length}
          onClearHistory={clearHistory}
          onOpenRequest={openHistoryInPlayground}
        />
      </div>

      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Collection"
        itemName={pendingDeleteName}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
