"use client";

import { GitBranch, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import type { ConditionNodeConfig } from "@/types/workflow";

function getRuleCountLabel(ruleCount: number) {
  switch (ruleCount) {
    case 0:
      return "No rules configured";
    case 1:
      return "1 rule";
    default:
      return `${ruleCount} rules`;
  }
}

export function ConditionCard({
  nodeId: _nodeId,
  config,
  isSelected,
  onDelete,
  onSelect,
}: {
  nodeId: string;
  config: ConditionNodeConfig;
  isSelected: boolean;
  onDelete: () => void;
  onSelect: () => void;
}) {
  const ruleCount = config.rules?.length ?? 0;

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
      aria-label={`Condition: ${config.label || "Unnamed"}`}
      className={cn(
        "flex w-full items-center justify-between gap-3 overflow-hidden rounded-[22px] border bg-background px-4 py-3.5 text-left shadow-sm transition-colors",
        isSelected
          ? "border-sky-500/40 shadow-xl ring-1 ring-sky-500/20"
          : "hover:border-border/40 hover:shadow-md",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/8">
          <GitBranch className="h-4 w-4 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {config.label || "Condition"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{getRuleCountLabel(ruleCount)}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full border border-sky-500/20 bg-sky-500/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-400">
          if / else
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="h-7 w-7 text-muted-foreground/40 hover:text-destructive"
          aria-label="Delete condition"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
