"use client";

import { Clock, Folder } from "lucide-react";
import {
  segmentedTabListClassName,
  segmentedTabTrackClassName,
  segmentedTabTriggerClassName,
} from "@/utils/ui/segmentedTabs";
import { cn } from "@/utils";

export type SidebarWorkspaceTab = "collections" | "history";

type SidebarWorkspaceTabsProps = {
  tab: SidebarWorkspaceTab;
  onTabChange: (tab: SidebarWorkspaceTab) => void;
  collapsed: boolean;
};

export function SidebarWorkspaceTabs({ tab, onTabChange, collapsed }: SidebarWorkspaceTabsProps) {
  const items: { id: SidebarWorkspaceTab; label: string; icon: typeof Folder }[] = [
    { id: "collections", label: "Collections", icon: Folder },
    { id: "history", label: "History", icon: Clock },
  ];

  if (collapsed) {
    return (
      <div
        className={cn(
          "flex w-full max-w-full flex-col items-stretch min-w-0",
          segmentedTabTrackClassName,
        )}
        role="tablist"
        aria-label="Sidebar section"
      >
        {items.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              title={label}
              onClick={() => onTabChange(id)}
              className={segmentedTabTriggerClassName(active, "h-7 w-full max-w-full shrink-0")}
            >
              <Icon className="h-3 w-3 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn("w-full", segmentedTabListClassName)}
      role="tablist"
      aria-label="Sidebar section"
    >
      {items.map(({ id, label, icon: Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(id)}
            className={segmentedTabTriggerClassName(active, "min-h-0 flex-1 px-2 py-1.5")}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
