"use client";

import type { LucideIcon } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";
import { WorkspacePane } from "./workspace-pane";

interface WorkspaceSectionProps {
  title: string;
  icon: LucideIcon;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function WorkspaceSection({
  title,
  icon: Icon,
  description,
  children,
  className,
}: WorkspaceSectionProps) {
  return (
    <WorkspacePane className={cn("rounded-2xl", className)}>
      <div className="px-6 py-4 border-b border-border/40 bg-muted/30 flex items-center gap-3 shrink-0">
        <Icon className="h-4 w-4 text-primary/70" />
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-80">
            {title}
          </span>
          {description && (
            <span className="text-[10px] text-muted-foreground mt-0.5 font-medium italic">
              {description}
            </span>
          )}
        </div>
      </div>
      <div className="p-6 space-y-6 bg-background/20 backdrop-blur-sm">{children}</div>
    </WorkspacePane>
  );
}
