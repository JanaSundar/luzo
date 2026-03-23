"use client";

import { Folder, Loader2, Plus, Search } from "lucide-react";
import { CollectionEditorDialog } from "@/components/collections/CollectionEditorDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkspaceHeader } from "@/components/ui/workspace-header";
import { WorkspacePane } from "@/components/ui/workspace-pane";
import { cn } from "@/lib/utils";
import type { Collection } from "@/types";

interface CollectionsSidebarPaneProps {
  collections: Collection[];
  isLoading: boolean;
  onCreateCollection: (payload: {
    description?: string;
    id: string;
    name: string;
  }) => Promise<void>;
  search: string;
  selectedCollectionId: string | null;
  setSearch: (value: string) => void;
  setSelectedCollectionId: (value: string) => void;
}

export function CollectionsSidebarPane({
  collections,
  isLoading,
  onCreateCollection,
  search,
  selectedCollectionId,
  setSearch,
  setSelectedCollectionId,
}: CollectionsSidebarPaneProps) {
  return (
    <WorkspacePane border>
      <WorkspaceHeader title="Collections" icon={Folder}>
        <CollectionEditorDialog
          onSave={onCreateCollection}
          trigger={
            <Button type="button" size="icon" variant="outline" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          }
        />
      </WorkspaceHeader>
      <div className="shrink-0 space-y-3 border-b border-border/60 p-4">
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
      <ScrollArea className="min-h-0 flex-1 no-scrollbar">
        <div className="divide-y divide-border/20 px-2">
          {isLoading ? (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : collections.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No collections yet.</p>
          ) : (
            collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                onClick={() => setSelectedCollectionId(collection.id)}
                className={cn(
                  "relative w-full px-3 py-3 text-left transition-all",
                  collection.id === selectedCollectionId
                    ? "text-primary"
                    : "text-muted-foreground/70 hover:text-foreground",
                )}
              >
                {collection.id === selectedCollectionId ? (
                  <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-[11px] font-bold uppercase tracking-widest">
                    {collection.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {collection.requests.length}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </WorkspacePane>
  );
}
