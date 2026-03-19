"use client";

import { Sparkles } from "lucide-react";

interface ReportExecutiveSummaryProps {
  summary: string | null;
}

export function ReportExecutiveSummary({ summary }: ReportExecutiveSummaryProps) {
  return (
    <section className="space-y-4">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5" />
        Summary
      </h3>

      {summary ? (
        <div className="rounded-2xl border bg-background/70 p-6 shadow-sm">
          <p className="text-sm leading-7 text-foreground/90">{summary}</p>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground space-y-3">
          <Sparkles className="h-8 w-8 mx-auto opacity-20" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground/60">No report generated yet</p>
            <p className="text-xs">
              Configure your signals, then click "Generate Report" above to build a structured
              report.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
