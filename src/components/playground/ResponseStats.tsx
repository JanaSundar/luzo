"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ResponseStatsProps {
  status: number;
  statusText: string;
  time: number;
  size: number;
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300)
    return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (status >= 300 && status < 400) return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
  if (status >= 400 && status < 500) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  if (status >= 500) return "bg-red-500/15 text-red-600 dark:text-red-400";
  return "bg-muted text-muted-foreground";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ResponseStats({ status, statusText, time, size }: ResponseStatsProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Badge className={cn("font-mono font-semibold text-sm", getStatusColor(status))}>
        {status} {statusText}
      </Badge>
      <span className="text-sm text-muted-foreground">{time}ms</span>
      <span className="text-sm text-muted-foreground">{formatSize(size)}</span>
    </div>
  );
}
