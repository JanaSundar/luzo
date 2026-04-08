"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils";

interface ResponseStatsProps {
  status: number;
  statusText: string;
  time: number;
  size: number;
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300)
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (status >= 300 && status < 400) return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  if (status >= 400 && status < 500) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  if (status >= 500) return "bg-red-500/10 text-red-600 border-red-500/20";
  return "bg-muted text-muted-foreground";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ResponseStats({ status, statusText, time, size }: ResponseStatsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* High-fidelity pill badge for status */}
      <Badge
        variant="outline"
        className={cn(
          "h-7 rounded-full border px-3 font-mono text-xs font-bold shadow-sm",
          getStatusColor(status),
        )}
      >
        {`${status} ${statusText}`}
      </Badge>

      {/* Muted stats with tracking, inspired by image */}
      <span className="text-[11px] font-bold tracking-tight text-muted-foreground/70">
        {time}ms
      </span>
      <span className="text-[11px] font-bold tracking-tight text-muted-foreground/70">
        {formatSize(size)}
      </span>
    </div>
  );
}
