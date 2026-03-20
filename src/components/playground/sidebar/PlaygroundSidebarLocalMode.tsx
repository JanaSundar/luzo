"use client";

import { Info } from "lucide-react";
import { SidebarGroup } from "@/components/ui/sidebar";

export function PlaygroundSidebarLocalMode() {
  return (
    <SidebarGroup>
      <div className="mx-2 px-3 py-4 group-data-[collapsible=icon]:mx-0 group-data-[collapsible=icon]:px-1">
        <div className="flex items-center gap-2 text-muted-foreground group-data-[collapsible=icon]:justify-center">
          <Info className="h-4 w-4 shrink-0 opacity-70" />
          <span className="text-[10px] font-semibold uppercase tracking-widest group-data-[collapsible=icon]:hidden">
            Local mode
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground group-data-[collapsible=icon]:hidden">
          Connect a database to sync collections.
        </p>
      </div>
    </SidebarGroup>
  );
}
