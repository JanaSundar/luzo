"use client";

import { Clock } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { RequestListRow } from "@/components/playground/sidebar/RequestListRow";
import { Separator } from "@/components/ui/separator";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { groupSavedRequestsByDay } from "@/lib/history/historyDayBuckets";
import { sortSavedRequestsByRecencyDesc } from "@/lib/history/sortSavedRequests";
import { useHistoryStore } from "@/lib/stores/useHistoryStore";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/relativeTime";
import type { ApiRequest } from "@/types";

type PlaygroundSidebarHistoryProps = {
  search: string;
  onLoadRequest: (request: ApiRequest, name: string) => void;
  isRequestActive: (request: ApiRequest) => boolean;
  onRemoveEntry: (id: string) => void;
};

export function PlaygroundSidebarHistory({
  search,
  onLoadRequest,
  isRequestActive,
  onRemoveEntry,
}: PlaygroundSidebarHistoryProps) {
  const history = useHistoryStore((s) => s.history);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const grouped = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = sortSavedRequestsByRecencyDesc(history);
    const filtered = !q
      ? list
      : list.filter(
          (item) =>
            item.request.url.toLowerCase().includes(q) ||
            item.request.method.toLowerCase().includes(q) ||
            (item.name?.toLowerCase().includes(q) ?? false),
        );
    return groupSavedRequestsByDay(filtered);
  }, [history, search]);

  const historyRows = useMemo(() => {
    const out: ReactNode[] = [];
    let first = true;
    for (const group of grouped) {
      if (!collapsed) {
        out.push(
          <SidebarMenuItem key={`label-${group.bucket}`} className="list-none pointer-events-none">
            <SidebarGroupLabel
              className={cn(
                "px-1.5 pt-2 pb-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
                group.bucket === grouped[0]?.bucket && "pt-0",
              )}
            >
              {group.label}
            </SidebarGroupLabel>
          </SidebarMenuItem>,
        );
      }
      group.items.forEach((item, i) => {
        const key = item.id ?? `h-${group.bucket}-${i}`;
        if (!first) {
          out.push(<Separator key={`sep-${key}`} className="shrink-0" />);
        }
        first = false;
        out.push(
          <SidebarMenuItem key={key} className="list-none w-full min-w-0 max-w-full">
            <RequestListRow
              method={item.request.method}
              name={item.name || item.request.url}
              url={item.request.url}
              isActive={isRequestActive(item.request)}
              plainCollapsedSurface={collapsed}
              plainMethod
              meta={formatRelativeTime(item.updatedAt)}
              onClick={() => onLoadRequest(item.request, item.name || item.request.url)}
              onDelete={() => onRemoveEntry(item.id)}
            />
          </SidebarMenuItem>,
        );
      });
    }
    return out;
  }, [grouped, collapsed, isRequestActive, onLoadRequest, onRemoveEntry]);

  return (
    <SidebarGroup className="w-full min-w-0 px-1.5 py-0">
      <SidebarGroupContent className="w-full min-w-0">
        <SidebarMenu className="w-full min-w-0 flex flex-col gap-0">
          {grouped.length === 0 ? (
            <SidebarMenuItem className="list-none">
              <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
                <Clock className="h-8 w-8 text-muted-foreground/35" />
                <p className="text-[11px] text-muted-foreground">
                  {search.trim() ? "No matching history" : "Run a request to see it here"}
                </p>
              </div>
            </SidebarMenuItem>
          ) : (
            historyRows
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
