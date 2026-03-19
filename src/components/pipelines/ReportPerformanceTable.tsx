"use client";

import { cn } from "@/lib/utils";
import type { ReportEndpointMetric } from "@/types/pipeline-debug";
import { Badge } from "./StepCard";

interface ReportPerformanceTableProps {
  results: ReportEndpointMetric[];
}

export function ReportPerformanceTable({ results }: ReportPerformanceTableProps) {
  return (
    <section className="space-y-6">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Endpoint Performance Metrics
      </h3>
      <div className="border rounded-xl overflow-hidden border-muted/50 shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-muted/30 border-b border-muted/50 uppercase tracking-widest text-[9px] font-bold">
                <th className="px-6 py-4">Method/Endpoint</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Latency</th>
                <th className="px-6 py-4">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30 font-mono">
              {results.map((r) => {
                const isError = r.outcome === "error";
                const isHighLatency = (r.latencyMs ?? 0) > 1000;
                const isOutlier = isError || isHighLatency;

                return (
                  <tr
                    key={r.stepId}
                    className={cn(
                      "group transition-colors",
                      isOutlier && "bg-red-500/5",
                      !isOutlier && "hover:bg-muted/5"
                    )}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          "inline-block w-12 mr-2 font-bold",
                          r.method === "GET"
                            ? "text-emerald-500"
                            : r.method === "POST"
                              ? "text-blue-500"
                              : r.method === "PUT"
                                ? "text-amber-500"
                                : r.method === "DELETE"
                                  ? "text-red-500"
                                  : "text-foreground"
                        )}
                      >
                        {r.method}
                      </span>
                      <span
                        className={cn(
                          isOutlier && "font-semibold",
                          !isOutlier && "text-muted-foreground"
                        )}
                      >
                        {r.stepName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        className={cn(
                          "h-5 rounded px-1.5 border font-mono text-[10px] font-bold",
                          r.outcome === "success"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : r.outcome === "warning"
                              ? "bg-amber-500/20 text-amber-700 border-amber-500/40"
                              : "bg-red-500/20 text-red-600 border-red-500/40"
                        )}
                      >
                        {r.statusCode ?? "N/A"}
                      </Badge>
                    </td>
                    <td
                      className={cn(
                        "px-6 py-4 font-bold whitespace-nowrap",
                        (r.latencyMs ?? 0) > 1000
                          ? "text-red-600"
                          : (r.latencyMs ?? 0) > 500
                            ? "text-amber-600"
                            : "text-foreground"
                      )}
                    >
                      {r.latencyMs ?? 0}ms
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {((r.sizeBytes ?? 0) / 1024).toFixed(1)}kb
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
