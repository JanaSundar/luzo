"use client";

import { cn } from "@/utils";
import type { ReportEndpointMetric } from "@/types/pipeline-debug";

function getMethodBadgeClass(method: string) {
  switch (method) {
    case "GET":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "POST":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "DELETE":
      return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    default:
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  }
}

function getOutcomeBadgeClass(outcome: ReportEndpointMetric["outcome"]) {
  switch (outcome) {
    case "success":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "warning":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    default:
      return "bg-rose-500/10 text-rose-600 border-rose-500/20";
  }
}

function getLatencyClass(latencyMs: number) {
  switch (true) {
    case latencyMs > 1000:
      return "text-rose-600";
    case latencyMs > 500:
      return "text-amber-600";
    default:
      return "text-foreground";
  }
}

interface ReportPerformanceTableProps {
  results: ReportEndpointMetric[];
}

export function ReportPerformanceTable({ results }: ReportPerformanceTableProps) {
  const safeResults = results ?? [];

  if (safeResults.length === 0) {
    return (
      <section className="space-y-6">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Endpoint Performance Metrics
        </h3>
        <p className="text-sm text-muted-foreground">No performance data available.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto custom-scrollbar rounded-xl border border-border/40 shadow-sm bg-white dark:bg-muted/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">
                Endpoint
              </th>
              <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">
                Status
              </th>
              <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">
                Latency
              </th>
              <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">
                Payload
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {safeResults.map((r) => {
              const isError = r.outcome === "error";
              const isHighLatency = (r.latencyMs ?? 0) > 1000;
              const isOutlier = isError || isHighLatency;

              return (
                <tr
                  key={r.stepId}
                  className={cn(
                    "group transition-colors h-20",
                    isOutlier ? "bg-red-500/[0.03]" : "hover:bg-muted/10",
                  )}
                >
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                      <span
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest w-12 text-center px-1.5 py-1 rounded-md shrink-0 border",
                          getMethodBadgeClass(r.method),
                        )}
                      >
                        {r.method}
                      </span>
                      <span className="text-base font-bold tracking-tight text-foreground truncate max-w-[300px]">
                        {r.stepName}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center min-w-[50px] h-8 rounded-xl text-xs font-black border",
                        getOutcomeBadgeClass(r.outcome),
                      )}
                    >
                      {r.statusCode ?? "---"}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span
                      className={cn(
                        "text-lg font-black tabular-nums tracking-tight",
                        getLatencyClass(r.latencyMs ?? 0),
                      )}
                    >
                      {r.latencyMs ?? 0}
                      <span className="text-[10px] ml-1 opacity-40 font-bold uppercase tracking-widest">
                        ms
                      </span>
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span className="text-xs font-bold text-muted-foreground tracking-tight">
                      {((r.sizeBytes ?? 0) / 1024).toFixed(1)}
                      <span className="opacity-40 ml-1 font-bold">KB</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
