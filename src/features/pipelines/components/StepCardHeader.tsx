"use client";

import { Check, GripVertical, Pencil, Zap } from "lucide-react";
import { type DragControls, motion } from "motion/react";
import type { RefObject } from "react";
import { PipelineBadge } from "@/components/pipelines/PipelineBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import { METHOD_BG_COLORS } from "@/utils/http";
import type { RiskSummary } from "@/types/worker-results";
import type { HttpMethod } from "@/types";

interface StepCardHeaderProps {
  executionHint?: {
    detail: string;
    mode: "parallel" | "review" | "sequential";
  };
  index: number;
  name: string;
  isSelected: boolean;
  renamingId: string | null;
  stepId: string;
  renameValue: string;
  renameInputRef: RefObject<HTMLInputElement | null>;
  dragControls: DragControls;
  onRenameStart: () => void;
  onRenameSave: () => void;
  onRenameCancel: () => void;
  onRenameValueChange: (val: string) => void;
  isMockEnabled?: boolean;
  runtimeBadge?: { label: string; tone: "default" | "failed" | "skipped" | "success" } | null;
  lineageSummary?: RiskSummary;
  method: HttpMethod;
  reorderable?: boolean;
}

export function StepCardHeader({
  executionHint,
  index,
  name,
  isSelected,
  renamingId,
  stepId,
  renameValue,
  renameInputRef,
  dragControls,
  onRenameStart,
  onRenameSave,
  onRenameCancel,
  onRenameValueChange,
  isMockEnabled = false,
  runtimeBadge = null,
  lineageSummary,
  method,
  reorderable = true,
}: StepCardHeaderProps) {
  return (
    <header className="flex min-h-[60px] min-w-0 items-center gap-3 border-b bg-muted/5 px-4 py-3">
      <button
        type="button"
        onPointerDown={(e) => {
          if (!reorderable) return;
          dragControls.start(e);
        }}
        className={cn(
          "inline-flex shrink-0 touch-none items-center justify-center rounded border-0 bg-transparent p-0 text-muted-foreground/40 hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none select-none cursor-grab active:cursor-grabbing",
          !reorderable && "cursor-default opacity-40 active:cursor-default",
        )}
        aria-label="Drag to reorder"
        title="Drag to reorder"
        disabled={!reorderable}
      >
        <GripVertical className="pointer-events-none h-4 w-4" aria-hidden />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <motion.div
          animate={{
            scale: isSelected ? 1.05 : 1,
            backgroundColor: isSelected ? "var(--foreground)" : "var(--muted)",
            color: isSelected ? "var(--background)" : "var(--muted-foreground)",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/50 text-[10px] font-bold shadow-inner"
        >
          {index + 1}
        </motion.div>

        <div className="min-w-0 flex-1">
          {renamingId === stepId ? (
            <div className="flex max-w-md items-center gap-1">
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => onRenameValueChange(e.target.value)}
                onBlur={onRenameSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onRenameSave();
                  if (e.key === "Escape") onRenameCancel();
                }}
                className="min-w-0 flex-1 rounded border bg-background px-2 py-0.5 text-sm font-bold outline-none ring-primary/20 transition-shadow focus:border-primary focus:ring-2"
              />
              <Button size="icon-xs" variant="ghost" onClick={onRenameSave}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex min-w-0 items-center gap-2 group/title">
                    <span className="min-w-0 truncate text-[15px] font-semibold leading-snug text-foreground">
                      {name || `Request ${index + 1}`}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover/title:opacity-100"
                      onClick={onRenameStart}
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                    {isMockEnabled && (
                      <div
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-foreground text-background shadow-[0_0_8px_rgba(15,23,42,0.18)]"
                        title="Mock mode enabled"
                      >
                        <Zap className="h-2.5 w-2.5 fill-current" />
                      </div>
                    )}
                  </div>
                  {executionHint?.detail ? (
                    <p className="truncate text-xs text-muted-foreground">{executionHint.detail}</p>
                  ) : null}
                </div>

                {runtimeBadge ? (
                  <PipelineBadge
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1",
                      runtimeBadge.tone === "success" &&
                        "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
                      runtimeBadge.tone === "failed" &&
                        "bg-rose-500/12 text-rose-700 dark:text-rose-300",
                      runtimeBadge.tone === "skipped" && "bg-muted text-muted-foreground",
                    )}
                  >
                    {runtimeBadge.label}
                  </PipelineBadge>
                ) : null}
              </div>

              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      METHOD_BG_COLORS[method],
                    )}
                  >
                    {method}
                  </span>

                  {executionHint ? (
                    <span className="rounded-full border border-border/40 bg-background/70 px-2.5 py-1 text-[11px] font-medium capitalize text-muted-foreground">
                      {executionHint.mode}
                    </span>
                  ) : null}
                </div>

                {lineageSummary &&
                (lineageSummary.incomingCount > 0 || lineageSummary.outgoingCount > 0) ? (
                  <div className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                    <span className="text-right">
                      {lineageSummary.incomingCount > 0
                        ? `${lineageSummary.incomingCount} upstream`
                        : ""}
                      {lineageSummary.incomingCount > 0 && lineageSummary.outgoingCount > 0
                        ? " · "
                        : ""}
                      {lineageSummary.outgoingCount > 0
                        ? `${lineageSummary.outgoingCount} downstream`
                        : ""}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
