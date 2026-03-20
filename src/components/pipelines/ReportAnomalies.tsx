"use client";

import { AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepSnapshot } from "@/types/pipeline-debug";

interface ReportAnomaliesProps {
  anomalies: StepSnapshot[];
}

function AnomalyCard({ anomaly }: { anomaly: StepSnapshot }) {
  const isError = anomaly.status === "error";
  const isHighLatency = (anomaly.reducedResponse?.latencyMs ?? 0) > 1000;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border-2",
        isError ? "bg-red-500/10 border-red-500/40" : "bg-amber-500/10 border-amber-500/40",
      )}
    >
      {isError ? (
        <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      )}
      <div className="space-y-1.5 min-w-0">
        <p className="text-sm font-bold truncate">
          {anomaly.method} {anomaly.stepName}
        </p>
        <p className="text-xs leading-relaxed">
          {isError && (
            <span className="font-bold text-red-600">
              Error: {anomaly.error ?? "Request failed"}
            </span>
          )}
          {isError && isHighLatency && " • "}
          {isHighLatency && (
            <span className="font-bold text-amber-600">
              High latency: {anomaly.reducedResponse?.latencyMs}ms
            </span>
          )}
        </p>
      </div>
    </div>
  );
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
          <AnomalyCard key={a.stepId} anomaly={a} />
        ))}
      </div>
    </section>
  );
}
