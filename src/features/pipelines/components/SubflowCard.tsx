"use client";

import { Boxes, GitBranchPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import type { SubflowDefinition, SubflowNodeConfig } from "@/types/workflow";

export function SubflowCard({
  config,
  definition,
  isSelected,
  onDelete,
  onSelect,
}: {
  config: SubflowNodeConfig;
  definition?: SubflowDefinition;
  isSelected: boolean;
  onDelete: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-[22px] border bg-background text-left shadow-sm transition-colors",
        isSelected ? "border-border/80 shadow-xl" : "hover:border-border/40 hover:shadow-md",
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b bg-muted/5 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-background">
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {config.label || definition?.name || "Subflow"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {definition?.description || "Reusable request flow"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border/50 bg-muted/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            v{config.subflowVersion}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>
            {definition?.inputSchema.length ?? Object.keys(config.inputBindings).length} input
          </span>
          <span>·</span>
          <span>
            {definition?.outputSchema.length ?? Object.keys(config.outputAliases).length} output
          </span>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <GitBranchPlus className="h-3 w-3" />
          Reusable
        </div>
      </div>
    </div>
  );
}
