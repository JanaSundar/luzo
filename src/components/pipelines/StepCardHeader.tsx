"use client";

import { Check, ChevronDown, GripVertical, Pencil } from "lucide-react";
import { type DragControls, motion } from "motion/react";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StepCardHeaderProps {
  index: number;
  name: string;
  isExpanded: boolean;
  renamingId: string | null;
  stepId: string;
  renameValue: string;
  renameInputRef: RefObject<HTMLInputElement | null>;
  dragControls: DragControls;
  onToggleExpand: () => void;
  onRenameStart: () => void;
  onRenameSave: () => void;
  onRenameCancel: () => void;
  onRenameValueChange: (val: string) => void;
}

export function StepCardHeader({
  index,
  name,
  isExpanded,
  renamingId,
  stepId,
  renameValue,
  renameInputRef,
  dragControls,
  onToggleExpand,
  onRenameStart,
  onRenameSave,
  onRenameCancel,
  onRenameValueChange,
}: StepCardHeaderProps) {
  return (
    <header className="flex min-h-[52px] min-w-0 items-center gap-3 border-b bg-muted/5 px-4 py-3">
      <button
        type="button"
        onPointerDown={(e) => dragControls.start(e)}
        className={cn(
          "inline-flex shrink-0 touch-none items-center justify-center rounded border-0 bg-transparent p-0 text-muted-foreground/40 hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none select-none cursor-grab active:cursor-grabbing"
        )}
        aria-label="Drag to reorder"
        title="Drag to reorder"
      >
        <GripVertical className="pointer-events-none h-4 w-4" aria-hidden />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <motion.div
          animate={{
            scale: isExpanded ? 1.1 : 1,
            backgroundColor: isExpanded ? "var(--primary-foreground)" : "var(--muted)",
            borderColor: isExpanded ? "var(--primary)" : "var(--border)",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted text-[10px] font-bold text-muted-foreground shadow-inner"
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
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggleExpand}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-expanded={isExpanded}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex items-center justify-center"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </Button>
      </div>
    </header>
  );
}
