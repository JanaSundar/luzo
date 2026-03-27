"use client";

import { Plus, Search } from "lucide-react";
import { CollectionEditorDialog } from "@/components/collections/CollectionEditorDialog";
import { SidebarHeader, SidebarInput } from "@/components/ui/sidebar";
import { cn } from "@/utils";

type PlaygroundSidebarHeaderProps = {
  canCreateCollection: boolean;
  onCreateCollection: (payload: {
    id: string;
    name: string;
    description?: string;
  }) => Promise<void>;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  showSearch: boolean;
};

export function PlaygroundSidebarHeader({
  canCreateCollection,
  onCreateCollection,
  search,
  onSearchChange,
  searchPlaceholder,
  showSearch,
}: PlaygroundSidebarHeaderProps) {
  return (
    <SidebarHeader
      className={cn(
        "gap-3 border-b border-border/40 p-3",
        "group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:pt-2",
      )}
    >
      <div className="hidden w-full flex-col items-center group-data-[collapsible=icon]:flex">
        <CollectionEditorDialog
          onSave={onCreateCollection}
          trigger={
            <button
              type="button"
              disabled={!canCreateCollection}
              title={
                canCreateCollection ? "New collection" : "Connect a database to create collections"
              }
              className={cn(
                "rounded-md p-1 text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !canCreateCollection && "cursor-not-allowed opacity-40",
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="sr-only">New collection</span>
            </button>
          }
        />
      </div>

      {showSearch && (
        <div className="relative group-data-[collapsible=icon]:hidden">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <SidebarInput
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 rounded-lg border border-border/50 bg-background pl-8 text-[11px] placeholder:text-muted-foreground/70"
          />
        </div>
      )}
    </SidebarHeader>
  );
}
