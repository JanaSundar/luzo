"use client";

import { ArrowDown, ArrowUp, GitBranch, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PipelineGenerationDraft, PreviewGrouping } from "@/types";
import { METHOD_BG_COLORS } from "@/lib/utils/http";
import { cn } from "@/lib/utils";

interface CollectionPipelineStepListProps {
  draft: PipelineGenerationDraft;
  moveStep: (stepId: string, direction: "up" | "down") => void;
  removeStep: (stepId: string) => void;
  setGrouping: (stepId: string, grouping: PreviewGrouping) => void;
  setStepName: (stepId: string, value: string) => void;
}

export function CollectionPipelineStepList({
  draft,
  moveStep,
  removeStep,
  setGrouping,
  setStepName,
}: CollectionPipelineStepListProps) {
  return (
    <div className="space-y-3">
      {draft.steps.map((step, index) => (
        <div key={step.id} className="rounded-xl border border-border/50 bg-background/80 p-3">
          <div className="flex items-start gap-3">
            <div className="flex flex-col gap-1 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => moveStep(step.id, "up")}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => moveStep(step.id, "down")}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <GitBranch className="h-3 w-3" />
                  Step {index + 1}
                </span>
                {step.unresolved.length > 0 ? (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    {step.unresolved.length} unresolved
                  </span>
                ) : null}
              </div>
              <input
                value={step.generatedName}
                onChange={(event) => setStepName(step.id, event.target.value)}
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={cn(
                    "font-mono text-[10px] font-semibold",
                    METHOD_BG_COLORS[step.request.method],
                  )}
                >
                  {step.request.method}
                </Badge>
                <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                  {step.request.url || "No URL yet"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={step.grouping === "sequential" ? "default" : "outline"}
                  size="xs"
                  onClick={() => setGrouping(step.id, "sequential")}
                >
                  Sequential
                </Button>
                <Button
                  type="button"
                  variant={step.grouping === "parallel" ? "default" : "outline"}
                  size="xs"
                  onClick={() => setGrouping(step.id, "parallel")}
                >
                  Parallel
                </Button>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => removeStep(step.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
