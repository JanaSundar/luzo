"use client";

import { Check, ChevronDown, ChevronUp, GripVertical, Pencil } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";

interface StepCardHeaderProps {
  index: number;
  name: string;
  isExpanded: boolean;
  renamingId: string | null;
  stepId: string;
  renameValue: string;
  renameInputRef: RefObject<HTMLInputElement | null>;
  dragHandleProps?: Record<string, unknown>;
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
  dragHandleProps,
  onToggleExpand,
  onRenameStart,
  onRenameSave,
  onRenameCancel,
  onRenameValueChange,
}: StepCardHeaderProps) {
  return (
    <div className="flex items-center gap-3 p-4 border-b bg-muted/5 group/header">
      <div
        {...dragHandleProps}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors shrink-0"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-[10px] font-bold text-muted-foreground shrink-0 border border-border/50 shadow-inner">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          {renamingId === stepId ? (
            <div className="flex items-center gap-1 max-w-sm">
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => onRenameValueChange(e.target.value)}
                onBlur={onRenameSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onRenameSave();
                  if (e.key === "Escape") onRenameCancel();
                }}
                className="flex-1 bg-background border rounded px-2 py-0.5 text-sm font-bold outline-none ring-primary/20 focus:ring-2 focus:border-primary transition-all"
              />
              <Button size="icon-xs" variant="ghost" onClick={onRenameSave}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/title">
              <span className="text-sm font-bold truncate leading-none">
                {name || `Request ${index + 1}`}
              </span>
              <button
                type="button"
                className="opacity-0 group-hover/title:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
                onClick={onRenameStart}
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggleExpand}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
