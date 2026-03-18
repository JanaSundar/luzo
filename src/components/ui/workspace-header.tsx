"use client";

import type { LucideIcon } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";

interface WorkspaceHeaderProps {
  title: string;
  icon?: LucideIcon;
  status?: string;
  children?: React.ReactNode;
  className?: string;
}

export function WorkspaceHeader({
  title,
  icon: Icon,
  status,
  children,
  className,
}: WorkspaceHeaderProps) {
  return (
    <div
      className={cn(
        "px-5 py-3 border-b border-border bg-muted/50 flex items-center justify-between shrink-0",
        className
      )}
    >
      <div className="flex items-center">
        {Icon && <Icon className="h-3.5 w-3.5 mr-2.5 opacity-70" />}
        <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">{title}</span>
        {status && (
          <>
            <div className="h-4 w-[1px] bg-border mx-3" />
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider opacity-60">
              {status}
            </span>
          </>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
