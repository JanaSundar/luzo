"use client";

import { Folder, Plus } from "lucide-react";
import { Fragment } from "react";
import { CollectionEditorDialog } from "@/components/collections/CollectionEditorDialog";
import { CollapsedCollectionItem } from "@/components/playground/sidebar/CollapsedCollectionItem";
import { CollectionTreeFolder } from "@/components/playground/sidebar/CollectionTreeFolder";
import { Separator } from "@/components/ui/separator";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { ApiRequest, Collection } from "@/types";

type PlaygroundSidebarCollectionsProps = {
  collections: Collection[];
  isLoading: boolean;
  search: string;
  onCreateCollection: (payload: {
    id: string;
    name: string;
    description?: string;
  }) => Promise<void>;
  onDeleteCollection: (id: string, name: string) => void;
  onDeleteRequest?: (requestId: string) => void | Promise<void>;
  onLoadRequest: (request: ApiRequest, name: string) => void;
  isRequestActive: (request: ApiRequest) => boolean;
};

export function PlaygroundSidebarCollections({
  collections,
  isLoading,
  search,
  onCreateCollection,
  onDeleteCollection,
  onDeleteRequest,
  onLoadRequest,
  isRequestActive,
}: PlaygroundSidebarCollectionsProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <SidebarGroup className="w-full min-w-0 px-1.5 py-0 group-data-[collapsible=icon]:px-1">
      <div className="mb-2 flex items-center justify-between px-1 group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="px-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Your collections
        </SidebarGroupLabel>
        <CollectionEditorDialog
          onSave={onCreateCollection}
          trigger={
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              title="New collection"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          }
        />
      </div>

      <SidebarGroupContent className="w-full min-w-0">
        <SidebarMenu className="w-full min-w-0 flex flex-col gap-0">
          {isLoading && collections.length === 0 ? (
            <SidebarMenuItem className="list-none">
              <div className="flex justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            </SidebarMenuItem>
          ) : collections.length === 0 ? (
            <SidebarMenuItem className="list-none">
              <div className="flex flex-col items-center gap-2 px-3 py-8 text-center group-data-[collapsible=icon]:py-4">
                <Folder className="h-8 w-8 text-muted-foreground/40 group-data-[collapsible=icon]:h-5 group-data-[collapsible=icon]:w-5" />
                <p className="text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
                  {search.trim() ? "No matches" : "No collections yet"}
                </p>
              </div>
            </SidebarMenuItem>
          ) : collapsed ? (
            collections.map((collection, index) => {
              const hasActiveRequest = collection.requests.some((r) => isRequestActive(r.request));
              return (
                <Fragment key={collection.id}>
                  {index > 0 ? <Separator className="shrink-0" /> : null}
                  <CollapsedCollectionItem
                    collection={collection}
                    hasActiveRequest={hasActiveRequest}
                    onLoadRequest={onLoadRequest}
                    isRequestActive={isRequestActive}
                    onDeleteRequest={onDeleteRequest}
                  />
                </Fragment>
              );
            })
          ) : (
            collections.map((collection, index) => {
              const hasActiveRequest = collection.requests.some((r) => isRequestActive(r.request));
              return (
                <Fragment key={collection.id}>
                  {index > 0 ? <Separator className="shrink-0" /> : null}
                  <CollectionTreeFolder
                    collection={collection}
                    hasActiveRequest={hasActiveRequest}
                    onDeleteCollection={onDeleteCollection}
                    onDeleteRequest={onDeleteRequest}
                    onLoadRequest={onLoadRequest}
                    isRequestActive={isRequestActive}
                  />
                </Fragment>
              );
            })
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
