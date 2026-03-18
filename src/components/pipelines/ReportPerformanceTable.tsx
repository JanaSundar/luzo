"use client";

import { cn } from "@/lib/utils";
import type { StepSnapshot } from "@/types/pipeline-debug";
import { Badge } from "./StepCard";

interface ReportPerformanceTableProps {
  results: StepSnapshot[];
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
              {results.map((r) => (
                <tr key={r.stepId} className="group hover:bg-muted/5 transition-colors">
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
                    <span className="text-muted-foreground">{r.stepName}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      className={cn(
                        "h-5 rounded px-1.5 border font-mono text-[10px]",
                        r.status === "success"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      )}
                    >
                      {r.reducedResponse?.status ?? r.status}
                    </Badge>
                  </td>
                  <td
                    className={cn(
                      "px-6 py-4 font-bold whitespace-nowrap",
                      (r.reducedResponse?.latencyMs ?? 0) > 1000
                        ? "text-red-500"
                        : (r.reducedResponse?.latencyMs ?? 0) > 500
                          ? "text-amber-500"
                          : "text-foreground"
                    )}
                  >
                    {r.reducedResponse?.latencyMs ?? 0}ms
                  </td>
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                    {((r.reducedResponse?.sizeBytes ?? 0) / 1024).toFixed(1)}kb
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
