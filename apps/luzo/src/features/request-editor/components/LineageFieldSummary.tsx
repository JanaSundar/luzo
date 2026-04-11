"use client";

import { AlertTriangle, ArrowDown, ArrowUpRight } from "lucide-react";
import { PipelineBadge } from "@/components/pipelines/PipelineBadge";
import { cn } from "@/utils";
import type { VariableReferenceEdge } from "@/types/worker-results";

function getResolutionIcon(resolutionStatus: VariableReferenceEdge["resolutionStatus"]) {
  switch (resolutionStatus) {
    case "resolved":
      return <ArrowUpRight className="h-3 w-3 text-emerald-600" />;
    case "runtime_only":
      return <ArrowDown className="h-3 w-3 text-sky-600" />;
    default:
      return <AlertTriangle className="h-3 w-3 text-amber-600" />;
  }
}

function getResolutionBadgeClass(resolutionStatus: VariableReferenceEdge["resolutionStatus"]) {
  switch (resolutionStatus) {
    case "resolved":
      return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
    case "runtime_only":
      return "bg-sky-500/12 text-sky-700 dark:text-sky-300";
    default:
      return "bg-amber-500/12 text-amber-700 dark:text-amber-300";
  }
}

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
          {getResolutionIcon(edge.resolutionStatus)}
          <span className="font-mono text-foreground/90">{edge.rawRef}</span>
          <PipelineBadge
            className={cn("px-1.5 py-0 text-[9px]", getResolutionBadgeClass(edge.resolutionStatus))}
          >
            {edge.resolutionStatus.replaceAll("_", " ")}
          </PipelineBadge>
        </span>
      ))}
    </div>
  );
}
