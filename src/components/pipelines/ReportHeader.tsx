"use client";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  accent: "green" | "amber" | "red";
}

export function StatCard({ label, value, accent }: StatCardProps) {
  const colors = {
    green: "bg-emerald-500/5 border-emerald-500/20 text-emerald-600",
    amber: "bg-amber-500/5 border-amber-500/20 text-amber-600",
    red: "bg-destructive/5 border-destructive/20 text-destructive",
  };

  return (
    <div className={cn("p-4 rounded-xl border", colors[accent])}>
      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

interface ReportHeaderProps {
  pipelineName: string;
  reportTitle: string;
  successRate: number;
  avgLatency: number;
  p95Latency: number;
  failCount: number;
}

export function ReportHeader({
  pipelineName,
  reportTitle,
  successRate,
  avgLatency,
  p95Latency,
  failCount,
}: ReportHeaderProps) {
  return (
    <div className="p-8 sm:p-12 pb-8 border-b border-muted/30 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-4">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{reportTitle}</h2>
          <div className="flex flex-col gap-1 uppercase tracking-widest text-[10px] font-bold text-muted-foreground">
            <span>PIPELINE: {pipelineName || "N/A"}</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-foreground" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Success Rate"
          value={`${successRate}%`}
          accent={successRate === 100 ? "green" : successRate > 80 ? "amber" : "red"}
        />
        <StatCard
          label="Avg Latency"
          value={`${avgLatency}ms`}
          accent={avgLatency < 500 ? "green" : "amber"}
        />
        <StatCard
          label="P95 Latency"
          value={`${p95Latency}ms`}
          accent={p95Latency < 1000 ? "green" : "red"}
        />
        <StatCard
          label="Errors"
          value={`${failCount}`}
          accent={failCount === 0 ? "green" : "red"}
        />
      </div>
    </div>
  );
}
