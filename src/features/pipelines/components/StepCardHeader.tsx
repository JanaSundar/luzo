"use client";

import { Check, GripVertical, Pencil, Zap } from "lucide-react";
import { type DragControls, motion } from "motion/react";
import type { RefObject } from "react";
import { PipelineBadge } from "@/components/pipelines/PipelineBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

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
}: StepCardHeaderProps) {
  return (
    <header className="flex min-h-[52px] min-w-0 items-center gap-3 border-b bg-muted/5 px-4 py-3">
      <button
        type="button"
        onPointerDown={(e) => dragControls.start(e)}
        className={cn(
          "inline-flex shrink-0 touch-none items-center justify-center rounded border-0 bg-transparent p-0 text-muted-foreground/40 hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none select-none cursor-grab active:cursor-grabbing",
        )}
        aria-label="Drag to reorder"
        title="Drag to reorder"
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
            <div className="space-y-0.5">
              <div className="flex min-w-0 items-center gap-2 group/title">
                <span className="min-w-0 truncate text-sm font-bold leading-snug text-foreground">
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
              {executionHint ? (
                <div className="flex min-w-0 items-center gap-2">
                  <PipelineBadge
                    className={cn(
                      executionHint.mode === "parallel" &&
                        "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
                      executionHint.mode === "sequential" &&
                        "bg-blue-500/12 text-blue-700 dark:text-blue-300",
                      executionHint.mode === "review" &&
                        "bg-amber-500/12 text-amber-700 dark:text-amber-300",
                    )}
                  >
                    {executionHint.mode}
                  </PipelineBadge>
                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                    {executionHint.detail}
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
