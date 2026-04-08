"use client";

import { AlertTriangle, ArrowDown, ArrowUpRight } from "lucide-react";
import { PipelineBadge } from "@/components/pipelines/PipelineBadge";
import { cn } from "@/utils";
import type { VariableReferenceEdge } from "@/types/worker-results";

export function LineageFieldSummary({
  incoming = [],
  className,
}: {
  incoming?: VariableReferenceEdge[];
  className?: string;
}) {
  if (incoming.length === 0) return null;

  return (
    <div className={cn("mt-2 flex flex-wrap items-center gap-2", className)}>
      {incoming.map((edge) => (
        <span
          key={edge.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/20 px-2 py-1 text-[10px] font-medium text-muted-foreground"
        >
          {edge.resolutionStatus === "resolved" ? (
            <ArrowUpRight className="h-3 w-3 text-emerald-600" />
          ) : edge.resolutionStatus === "runtime_only" ? (
            <ArrowDown className="h-3 w-3 text-sky-600" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-amber-600" />
          )}
          <span className="font-mono text-foreground/90">{edge.rawRef}</span>
          <PipelineBadge
            className={cn(
              "px-1.5 py-0 text-[9px]",
              edge.resolutionStatus === "resolved" &&
                "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
              edge.resolutionStatus === "runtime_only" &&
                "bg-sky-500/12 text-sky-700 dark:text-sky-300",
              edge.resolutionStatus !== "resolved" &&
                edge.resolutionStatus !== "runtime_only" &&
                "bg-amber-500/12 text-amber-700 dark:text-amber-300",
            )}
          >
            {edge.resolutionStatus.replaceAll("_", " ")}
          </PipelineBadge>
        </span>
      ))}
    </div>
  );
}
