"use client";

import { Settings } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlaygroundSidebarCollections } from "@/components/playground/sidebar/PlaygroundSidebarCollections";
import { PlaygroundSidebarHeader } from "@/components/playground/sidebar/PlaygroundSidebarHeader";
import { PlaygroundSidebarHistory } from "@/components/playground/sidebar/PlaygroundSidebarHistory";
import { PlaygroundSidebarLocalMode } from "@/components/playground/sidebar/PlaygroundSidebarLocalMode";
import {
  type SidebarWorkspaceTab,
  SidebarWorkspaceTabs,
} from "@/components/playground/sidebar/SidebarWorkspaceTabs";
import { useConfirmLoadRequest } from "@/components/playground/sidebar/useConfirmLoadRequest";
import { AnimatedTabContent } from "@/components/ui/animated-tab-content";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Sidebar, SidebarContent, SidebarFooter } from "@/components/ui/sidebar";
import { useCollectionMutations, useCollectionsQuery } from "@/lib/collections/useCollections";
import { useHistoryStore } from "@/lib/stores/useHistoryStore";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import { cn } from "@/lib/utils";
import type { ApiRequest } from "@/types";

type PendingDelete =
  | { kind: "collection"; id: string; name: string }
  | { kind: "request"; id: string }
  | { kind: "history"; id: string };

export function PlaygroundSidebar() {
  const { dbStatus, dbSchemaReady } = useSettingsStore();

  const { data: collections = [], isLoading } = useCollectionsQuery();
  const {
    saveCollection: saveCollectionMutation,
    deleteCollection: deleteCollectionMutation,
    deleteRequest: deleteRequestMutation,
  } = useCollectionMutations();
  const removeFromHistory = useHistoryStore((s) => s.removeFromHistory);

  const currentRequest = usePlaygroundStore((s) => s.request);
  const { loadRequest, loadRequestConfirmDialog } = useConfirmLoadRequest();

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const [tab, setTab] = useState<SidebarWorkspaceTab>("history");
  const [search, setSearch] = useState("");

  const canUseCollections = dbStatus === "connected" && dbSchemaReady;

  // Fix hydration mismatch by setting the initial tab in useEffect
  useEffect(() => {
    const { dbStatus, dbSchemaReady } = useSettingsStore.getState();
    if (dbStatus === "connected" && dbSchemaReady) {
      setTab("collections");
    }
  }, []);

  const filteredCollections = useMemo(() => {
    if (!canUseCollections) return [];
    const q = search.toLowerCase().trim();
    return collections
      .map((c) => ({
        ...c,
        requests: c.requests.filter((r) => `${r.name} ${r.request.url}`.toLowerCase().includes(q)),
      }))
      .filter((c) => c.name.toLowerCase().includes(q) || c.requests.length > 0);
  }, [collections, search, canUseCollections]);

  const isRequestActive = (request: ApiRequest) =>
    request.url === currentRequest.url && request.method === currentRequest.method;

  const handleCreateCollection = async (payload: {
    id: string;
    name: string;
    description?: string;
  }) => {
    try {
      await saveCollectionMutation.mutateAsync({
        id: payload.id,
        name: payload.name,
        description: payload.description,
      });
      toast.success(`Created: ${payload.name}`);
    } catch {
      toast.error("Failed to create collection");
    }
  };

  const handleDeleteCollection = (id: string, name: string) => {
    setPendingDelete({ kind: "collection", id, name });
  };

  const handleDeleteCollectionRequest = (requestId: string) => {
    setPendingDelete({ kind: "request", id: requestId });
  };

  const handleRemoveHistoryEntry = (id: string) => {
    setPendingDelete({ kind: "history", id });
  };

  const confirmPendingDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const p = pendingDelete;
    try {
      if (p.kind === "collection") {
        await deleteCollectionMutation.mutateAsync(p.id);
        toast.success(`Deleted: ${p.name}`);
      } else if (p.kind === "request") {
        await deleteRequestMutation.mutateAsync(p.id);
        toast.success("Request removed");
      } else {
        removeFromHistory(p.id);
        toast.success("Removed from history");
      }
      setPendingDelete(null);
    } catch {
      if (p.kind === "collection") {
        toast.error("Failed to delete collection");
      } else if (p.kind === "request") {
        toast.error("Failed to delete request");
      }
    }
  }, [pendingDelete, deleteCollectionMutation, deleteRequestMutation, removeFromHistory]);

  const isDeletePending = deleteCollectionMutation.isPending || deleteRequestMutation.isPending;

  const deleteDialogCopy = useMemo(() => {
    if (!pendingDelete) return null;
    if (pendingDelete.kind === "collection") {
      return {
        title: "Delete collection",
        description: (
          <>
            Delete collection{" "}
            <span className="font-medium text-foreground">&quot;{pendingDelete.name}&quot;</span>?
            This cannot be undone.
          </>
        ),
        confirmLabel: "Delete",
        pendingLabel: "Deleting...",
        destructive: true as const,
      };
    }
    if (pendingDelete.kind === "request") {
      return {
        title: "Delete saved request",
        description: "Delete this saved request? This cannot be undone.",
        confirmLabel: "Delete",
        pendingLabel: "Deleting...",
        destructive: true as const,
      };
    }
    return {
      title: "Remove from history",
      description: "Remove this entry from history?",
      confirmLabel: "Remove",
      pendingLabel: "Removing...",
      destructive: false as const,
    };
  }, [pendingDelete]);

  return (
    <Sidebar
      collapsible="none"
      className="top-14 h-[calc(100svh-3.5rem)] border-r border-border/40"
    >
      {loadRequestConfirmDialog}
      {deleteDialogCopy && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPendingDelete(null)}
          title={deleteDialogCopy.title}
          description={deleteDialogCopy.description}
          confirmLabel={deleteDialogCopy.confirmLabel}
          pendingLabel={deleteDialogCopy.pendingLabel}
          isPending={isDeletePending}
          destructive={deleteDialogCopy.destructive}
          onConfirm={confirmPendingDelete}
        />
      )}
      <div
        className={cn(
          "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
          "group-data-[collapsible=icon]:mx-1.5 group-data-[collapsible=icon]:my-2 group-data-[collapsible=icon]:max-h-[calc(100svh-3.5rem-1rem)] group-data-[collapsible=icon]:rounded-2xl group-data-[collapsible=icon]:border group-data-[collapsible=icon]:border-border/45 group-data-[collapsible=icon]:bg-sidebar group-data-[collapsible=icon]:shadow-md",
        )}
      >
        <PlaygroundSidebarHeader
          canCreateCollection={canUseCollections}
          onCreateCollection={handleCreateCollection}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={tab === "collections" ? "Search collections…" : "Search history…"}
          showSearch
        />

        <div
          className={cn(
            "shrink-0 px-3 pb-2",
            "group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:pb-2",
          )}
        >
          <SidebarWorkspaceTabs tab={tab} onTabChange={setTab} collapsed={false} />
        </div>

        <SidebarContent className="no-scrollbar min-w-0 px-2 pb-2 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:pb-2">
          <AnimatePresence mode="wait">
            {!canUseCollections && tab === "collections" && (
              <AnimatedTabContent key="collections-local" className="w-full min-w-0">
                <PlaygroundSidebarLocalMode />
              </AnimatedTabContent>
            )}
            {tab === "history" && (
              <AnimatedTabContent key="history" className="w-full min-w-0">
                <PlaygroundSidebarHistory
                  search={search}
                  onLoadRequest={loadRequest}
                  isRequestActive={isRequestActive}
                  onRemoveEntry={handleRemoveHistoryEntry}
                />
              </AnimatedTabContent>
            )}
            {canUseCollections && tab === "collections" && (
              <AnimatedTabContent key="collections" className="w-full min-w-0">
                <PlaygroundSidebarCollections
                  collections={filteredCollections}
                  isLoading={isLoading}
                  search={search}
                  onCreateCollection={handleCreateCollection}
                  onDeleteCollection={handleDeleteCollection}
                  onDeleteRequest={canUseCollections ? handleDeleteCollectionRequest : undefined}
                  onLoadRequest={loadRequest}
                  isRequestActive={isRequestActive}
                />
              </AnimatedTabContent>
            )}
          </AnimatePresence>
        </SidebarContent>

        <SidebarFooter className="border-t border-border/40 p-2 group-data-[collapsible=icon]:p-2">
          <div className="flex w-full items-center justify-end gap-2 px-1">
            <Link
              href="/settings"
              aria-label="Settings"
              title="Settings"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "h-8 w-8 shrink-0 rounded-lg",
                "group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7",
              )}
            >
              <motion.div
                whileHover={{ rotate: 18 }}
                whileTap={{ rotate: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 360, damping: 20 }}
                className="flex items-center justify-center"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </Link>
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
