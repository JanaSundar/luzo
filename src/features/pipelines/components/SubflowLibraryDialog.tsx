"use client";

import { Boxes, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { cn } from "@/utils";

export function SubflowLibraryDialog({
  pipelineId,
  className,
}: {
  pipelineId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pipelines = usePipelineStore((state) => state.pipelines);
  const subflowDefinitions = usePipelineStore((state) => state.subflowDefinitions);
  const insertSubflow = usePipelineStore((state) => state.insertSubflow);
  const deleteSubflowDefinition = usePipelineStore((state) => state.deleteSubflowDefinition);
  const sortedDefinitions = useMemo(
    () => [...subflowDefinitions].sort((a, b) => a.name.localeCompare(b.name)),
    [subflowDefinitions],
  );
  const usageCountByKey = useMemo(() => {
    const counts = new Map<string, number>();
    pipelines.forEach((pipeline) => {
      pipeline.flowDocument?.nodes.forEach((node) => {
        if (node.kind !== "subflow" || node.config?.kind !== "subflow") return;
        const key = `${node.config.subflowId}:${node.config.subflowVersion}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });
    return counts;
  }, [pipelines]);

  const handleInsert = () => {
    if (!selectedId) return;
    insertSubflow(pipelineId, selectedId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 gap-2 rounded-full border-border/60 bg-background px-5 text-sm font-semibold tracking-tight text-foreground shadow-sm hover:bg-muted/50",
              className,
            )}
          >
            <Boxes className="h-4 w-4" />
            Use Subflow
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Use Subflow</DialogTitle>
          <DialogDescription>
            Insert a reusable subflow into this pipeline. Create subflows from a request card first,
            then reuse them here.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[52dvh] overflow-y-auto pr-1">
          {sortedDefinitions.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/10 p-6 text-center">
              <div className="rounded-full bg-background p-3 ring-1 ring-border/50">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">No subflows yet</p>
                <p className="text-xs text-muted-foreground">
                  Open a request card menu and create a subflow from an existing request to start
                  your library.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedDefinitions.map((definition) => {
                const selected = selectedId === definition.id;
                const definitionKey = `${definition.id}:${definition.version}`;
                const usageCount = usageCountByKey.get(definitionKey) ?? 0;
                return (
                  <div
                    key={`${definition.id}:${definition.version}`}
                    onClick={() => setSelectedId(definition.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(definition.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "flex w-full flex-col gap-3 rounded-2xl border p-4 text-left transition-colors",
                      selected
                        ? "border-primary/40 bg-primary/5 shadow-sm"
                        : "border-border/50 bg-background hover:bg-muted/20",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{definition.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {definition.description || "Reusable request flow"}
                        </p>
                      </div>
                      <span className="rounded-full border border-border/50 bg-muted/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        v{definition.version}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{definition.workflow.nodes.length} internal request</span>
                        <span>·</span>
                        <span>{definition.inputSchema.length} input</span>
                        <span>·</span>
                        <span>{definition.outputSchema.length} output</span>
                        {usageCount > 0 ? (
                          <>
                            <span>·</span>
                            <span>{usageCount} in use</span>
                          </>
                        ) : null}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={usageCount > 0}
                        title={
                          usageCount > 0
                            ? "Remove subflow usages before deleting"
                            : "Delete subflow"
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          if (usageCount > 0) return;
                          if (selectedId === definition.id) {
                            setSelectedId(null);
                          }
                          deleteSubflowDefinition(definition.id, definition.version);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleInsert} disabled={!selectedId}>
            Insert Subflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
