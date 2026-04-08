"use client";

import {
  ChevronRight,
  Download,
  FileJson2,
  Folder,
  GitBranch,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Fragment } from "react";
import { RequestListRow } from "@/components/playground/sidebar/RequestListRow";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem } from "@/components/ui/sidebar";
import { exportCollectionToOpenApi } from "@/features/exporters/pipeline-openapi";
import { exportCollectionToPostman } from "@/features/exporters/pipeline-postman";
import { collectionToPipelineHref } from "@/features/pipeline/collectionToPipelineHref";
import { downloadTextFile, slugifyFilenamePart } from "@/features/reports/export-download";
import { cn } from "@/utils";
import type { ApiRequest, Collection, SavedRequest } from "@/types";

type CollectionTreeFolderProps = {
  collection: Collection;
  hasActiveRequest: boolean;
  isOpen: boolean;
  onDeleteCollection: (id: string, name: string) => void;
  onDeleteRequest?: (requestId: string) => void | Promise<void>;
  onLoadRequest: (request: SavedRequest, name: string) => void;
  onOpenChange: (open: boolean) => void;
  isRequestActive: (request: ApiRequest) => boolean;
};

export function CollectionTreeFolder({
  collection,
  hasActiveRequest,
  isOpen,
  onDeleteCollection,
  onDeleteRequest,
  onLoadRequest,
  onOpenChange,
  isRequestActive,
}: CollectionTreeFolderProps) {
  const router = useRouter();
  const regionId = `collection-folder-${collection.id}`;
  const slug = slugifyFilenamePart(collection.name, "collection");

  const handlePostmanExport = () => {
    downloadTextFile(
      exportCollectionToPostman(collection),
      `${slug}.postman_collection.json`,
      "application/json",
    );
  };

  const handleOpenApiExport = () => {
    downloadTextFile(
      exportCollectionToOpenApi(collection),
      `${slug}.openapi.json`,
      "application/json",
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange} className="group/collapsible">
      <SidebarMenuItem className="w-full min-w-0 max-w-full">
        <div className="flex items-center rounded-md pr-1 transition-colors">
          <CollapsibleTrigger
            aria-controls={regionId}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pl-1.5 pr-1 text-left text-[13px] font-medium outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring",
              hasActiveRequest ? "text-foreground" : "text-foreground/90",
            )}
          >
            <motion.span
              className="inline-flex shrink-0 text-muted-foreground"
              initial={false}
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </motion.span>
            <Folder
              className={cn(
                "h-4 w-4 shrink-0",
                hasActiveRequest ? "text-foreground" : "text-muted-foreground",
              )}
            />
            <span className="min-w-0 flex-1 truncate">{collection.name}</span>
          </CollapsibleTrigger>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-transparent hover:text-foreground group-hover/menu-item:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Collection actions"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 p-1.5">
              <DropdownMenuGroup className="pb-1">
                <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                  Create
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className="cursor-pointer gap-2 pl-5 text-[11px]"
                  onClick={() => router.push(collectionToPipelineHref(collection.id))}
                >
                  <GitBranch className="h-3 w-3" /> Pipeline
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuGroup className="pt-1 pb-1">
                <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                  Export
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className="cursor-pointer gap-2 pl-5 text-[11px]"
                  onClick={handlePostmanExport}
                >
                  <Download className="h-3 w-3" /> To Postman
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2 pl-5 text-[11px]"
                  onClick={handleOpenApiExport}
                >
                  <FileJson2 className="h-3 w-3" /> To OpenAPI
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuItem
                className="mt-1 cursor-pointer gap-2 text-[11px] text-foreground"
                onClick={() => onDeleteCollection(collection.id, collection.name)}
              >
                <Trash2 className="h-3 w-3" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              id={regionId}
              role="region"
              aria-hidden={!isOpen}
              className={cn(
                "transition-opacity duration-150 ease-out",
                isOpen ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              <SidebarMenuSub className="mx-0 ml-2 mt-0.5 w-full min-w-0 max-w-full pl-2 pb-0.5">
                {collection.requests.map((req, index) => (
                  <Fragment key={req.id}>
                    {index > 0 ? <Separator className="shrink-0" /> : null}
                    <SidebarMenuSubItem className="list-none w-full min-w-0 max-w-full">
                      <RequestListRow
                        method={req.request.method}
                        name={req.name}
                        url={req.request.url}
                        isActive={isRequestActive(req.request)}
                        onClick={() => onLoadRequest(req, req.name)}
                        onDelete={
                          onDeleteRequest
                            ? () => {
                                void onDeleteRequest(req.id);
                              }
                            : undefined
                        }
                      />
                    </SidebarMenuSubItem>
                  </Fragment>
                ))}
              </SidebarMenuSub>
            </div>
          </div>
        </div>
      </SidebarMenuItem>
    </Collapsible>
  );
}
