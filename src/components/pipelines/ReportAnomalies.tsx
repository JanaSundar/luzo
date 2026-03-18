"use client";

import { AlertTriangle } from "lucide-react";
import type { StepSnapshot } from "@/types/pipeline-debug";

interface ReportAnomaliesProps {
  anomalies: StepSnapshot[];
}

export function ReportAnomalies({ anomalies }: ReportAnomaliesProps) {
  if (anomalies.length === 0) return null;

  return (
    <section className="space-y-6">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        Observations & Anomalies
      </h3>
      <div className="space-y-3">
        {anomalies.map((a) => (
          <div
            key={a.stepId}
            className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg"
          >
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {a.method} {a.stepName}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {a.status === "error" && `Error: ${a.error ?? "Request failed"}. `}
                {a.reducedResponse &&
                  a.reducedResponse.latencyMs > 1000 &&
                  `High latency: ${a.reducedResponse.latencyMs}ms. `}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
