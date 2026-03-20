"use client";

import { Folder, Trash2 } from "lucide-react";
import { httpMethodBadgeClass } from "@/components/playground/sidebar/httpMethodStyles";
import { UrlStartEllipsisText } from "@/components/playground/sidebar/UrlStartEllipsisText";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { SidebarMenuItem } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  isStrippedRequestNameEqualToUrl,
  stripMethodPrefixFromRequestName,
} from "@/lib/utils/requestDisplayName";
import type { ApiRequest, Collection } from "@/types";

type CollapsedCollectionItemProps = {
  collection: Collection;
  hasActiveRequest: boolean;
  onLoadRequest: (request: ApiRequest, name: string) => void;
  isRequestActive: (request: ApiRequest) => boolean;
  onDeleteRequest?: (requestId: string) => void | Promise<void>;
};

export function CollapsedCollectionItem({
  collection,
  hasActiveRequest,
  onLoadRequest,
  isRequestActive,
  onDeleteRequest,
}: CollapsedCollectionItemProps) {
  return (
    <SidebarMenuItem>
      <HoverCard>
        <HoverCardTrigger
          className={cn(
            "flex h-9 w-full max-w-full cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent p-0 shadow-none outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 max-w-full shrink-0 items-center justify-center rounded-md text-[10px] font-bold transition-colors",
              hasActiveRequest ? "bg-foreground text-background" : "text-muted-foreground"
            )}
          >
            {collection.name.charAt(0).toUpperCase()}
          </span>
        </HoverCardTrigger>
        <HoverCardContent
          side="right"
          align="start"
          sideOffset={10}
          className="w-[min(18rem,calc(100vw-4rem))] overflow-hidden rounded-xl border-border/40 p-0 shadow-xl"
        >
          <div className="border-b border-border/40 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background">
                <Folder className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="wrap-break-word text-xs font-semibold leading-snug">
                  {collection.name}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {collection.requests.length} request{collection.requests.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>
          <div className="max-h-[280px] overflow-y-auto p-2">
            <div className="flex flex-col gap-1">
              {collection.requests.map((req) => {
                const active = isRequestActive(req.request);
                const displayName = stripMethodPrefixFromRequestName(req.name, req.request.method);
                const urlDuplicateAsTitle = isStrippedRequestNameEqualToUrl(
                  req.name,
                  req.request.method,
                  req.request.url
                );
                const rowInner = (
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {urlDuplicateAsTitle ? (
                      <UrlStartEllipsisText
                        text={req.request.url}
                        className="font-mono text-[11px] leading-snug text-foreground"
                      />
                    ) : (
                      <span
                        className={cn(
                          "min-w-0 truncate font-mono text-[11px]",
                          active ? "font-medium text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {displayName}
                      </span>
                    )}
                    <span
                      className={cn(
                        httpMethodBadgeClass(req.request.method, { naturalWidth: true }),
                        "w-fit shrink-0"
                      )}
                    >
                      {req.request.method}
                    </span>
                    {!urlDuplicateAsTitle ? (
                      <UrlStartEllipsisText
                        text={req.request.url}
                        className="font-mono text-[10px] leading-snug text-muted-foreground"
                      />
                    ) : null}
                  </div>
                );

                return (
                  <div
                    key={req.id}
                    className={cn(
                      "group/row flex w-full min-w-0 items-start gap-0.5 rounded-lg px-1.5 py-1 transition-colors",
                      "hover:bg-transparent",
                      active && "ring-1 ring-inset ring-border/70"
                    )}
                  >
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            onClick={() => onLoadRequest(req.request, req.name)}
                            className="flex min-w-0 flex-1 flex-col gap-1 rounded-md px-1 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {rowInner}
                          </button>
                        }
                      />
                      <TooltipContent
                        hideArrow
                        side="right"
                        align="start"
                        sideOffset={8}
                        className="max-w-[min(24rem,calc(100vw-3rem))] border border-border/40 bg-popover px-3 py-2 font-mono text-[11px] text-popover-foreground shadow-lg"
                      >
                        <p className="break-all leading-relaxed">{req.request.url}</p>
                      </TooltipContent>
                    </Tooltip>
                    {onDeleteRequest ? (
                      <button
                        type="button"
                        aria-label="Delete saved request"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void onDeleteRequest(req.id);
                        }}
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
                          "hover:bg-destructive/10 hover:text-destructive",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        )}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </SidebarMenuItem>
  );
}
