"use client";

import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { ACTION_BUTTON_CLASSES_NO_HOVER, cn } from "@/lib/utils";
import type { Pipeline } from "@/types";

interface PipelineSidebarProps {
  pipelines: Pipeline[];
  activePipelineId: string | null;
  selectionMode: boolean;
  selectedIds: string[];
  sidebarOpen: boolean;
  renamingId: string | null;
  renameValue: string;
  renameInputRef: RefObject<HTMLInputElement | null>;
  onAddPipeline: (name: string) => void;
  onSetActivePipeline: (id: string) => void;
  onToggleSelectionMode: () => void;
  onToggleSelection: (id: string) => void;
  onRenameStart: (id: string, name: string) => void;
  onRenameSave: () => void;
  onRenameCancel: () => void;
  onRenameValueChange: (val: string) => void;
  onDeleteClick: (id: string) => void;
  onBatchDeleteClick: () => void;
}

export function PipelineSidebar({
  pipelines,
  activePipelineId,
  selectionMode,
  selectedIds,
  sidebarOpen,
  renamingId,
  renameValue,
  renameInputRef,
  onAddPipeline,
  onSetActivePipeline,
  onToggleSelectionMode,
  onToggleSelection,
  onRenameStart,
  onRenameSave,
  onRenameCancel,
  onRenameValueChange,
  onDeleteClick,
  onBatchDeleteClick,
}: PipelineSidebarProps) {
  return (
    <aside
      className={cn(
        "bg-muted/20 flex flex-col min-h-0 border-r",
        "fixed inset-y-0 left-0 z-40 w-64 transition-transform duration-200 lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Saved Pipelines
        </h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            onClick={onToggleSelectionMode}
            variant="ghost"
            size="xs"
            className={cn(
              "px-2 font-bold uppercase tracking-widest text-[9px]",
              selectionMode && "bg-primary/10 text-primary",
            )}
          >
            {selectionMode ? "Cancel" : "Select"}
          </Button>
          <Button type="button" onClick={() => onAddPipeline("")} variant="ghost" size="icon-xs">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid border-b transition-[grid-template-rows] duration-200 ease-out",
          selectionMode ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex items-center justify-between bg-muted/30 px-4 py-2">
            <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
              {selectedIds.length} selected
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={selectedIds.length === 0}
              onClick={onBatchDeleteClick}
              className={ACTION_BUTTON_CLASSES_NO_HOVER}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Selected
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {pipelines.map((p) => (
          <div key={p.id} className="group relative">
            {renamingId === p.id ? (
              <div className="flex items-center gap-1 px-2 py-1">
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => onRenameValueChange(e.target.value)}
                  onBlur={onRenameSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onRenameSave();
                    if (e.key === "Escape") onRenameCancel();
                  }}
                  className="flex-1 bg-background border rounded px-2 py-1 text-sm font-medium outline-none focus:ring-1 focus:ring-primary"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 shrink-0"
                  onClick={onRenameSave}
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (selectionMode) {
                    onToggleSelection(p.id);
                  } else {
                    onSetActivePipeline(p.id);
                  }
                }}
                onDoubleClick={() => !selectionMode && onRenameStart(p.id, p.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    if (selectionMode) onToggleSelection(p.id);
                    else onSetActivePipeline(p.id);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-primary",
                  activePipelineId === p.id && !selectionMode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {selectionMode ? (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => onToggleSelection(p.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-3.5 w-3.5 accent-primary rounded border-gray-300 focus:ring-primary"
                  />
                ) : (
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      activePipelineId === p.id ? "bg-primary-foreground" : "bg-primary",
                    )}
                  />
                )}
                <span className="min-w-0 flex-1 truncate text-left">{p.name}</span>

                {!selectionMode && (
                  <div
                    className={cn(
                      "flex items-center gap-0.5 shrink-0 transition-opacity",
                      activePipelineId === p.id
                        ? "opacity-70 hover:opacity-100"
                        : "opacity-0 group-hover:opacity-70",
                    )}
                  >
                    <button
                      type="button"
                      className="p-0.5 hover:bg-background/20 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRenameStart(p.id, p.name);
                      }}
                      title="Rename"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="p-0.5 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteClick(p.id);
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
