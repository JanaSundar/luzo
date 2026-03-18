"use client";

import { useMemo } from "react";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { Play } from "lucide-react";
import type { HttpMethod } from "@/types";
import type { StepSnapshot } from "@/types/pipeline-debug";
import { deriveReportTitle } from "@/lib/utils/report-title";
import { ReportAnomalies } from "./ReportAnomalies";
import { ReportExecutiveSummary } from "./ReportExecutiveSummary";
import { ReportHeader } from "./ReportHeader";
import { ReportPerformanceTable } from "./ReportPerformanceTable";

export function ReportPreview() {
  const { pipelines, activePipelineId, executionResult } = usePipelineStore();
  const { reportOutput, reportTitle: aiReportTitle } = usePipelineDebugStore();

  const pipeline = useMemo(
    () => pipelines.find((p) => p.id === activePipelineId),
    [pipelines, activePipelineId]
  );

  const results = useMemo(() => {
    if (!executionResult) return [];
    return executionResult.results.map((r) => {
      let summary: Record<string, unknown> = {};
      try {
        if (r.body) summary = JSON.parse(r.body) as Record<string, unknown>;
      } catch {
        summary = { raw: r.body?.slice(0, 200) ?? "" };
      }
      return {
        stepId: r.stepId,
        stepName: r.stepName,
        method: r.method as HttpMethod,
        url: r.url,
        status: r.status >= 200 && r.status < 300 ? "success" : "error",
        reducedResponse: {
          status: r.status,
          statusText: r.statusText,
          latencyMs: r.time,
          sizeBytes: r.size,
          summary,
          headers: r.headers,
        },
        resolvedRequest: {
          url: r.url,
          headers: r.headers,
          body: "",
        },
        variables: {},
        error: r.status >= 300 ? r.statusText : null,
        startedAt: executionResult.startTime,
        completedAt: executionResult.endTime ?? new Date().toISOString(),
      };
    }) as StepSnapshot[];
  }, [executionResult]);

  const stats = useMemo(() => {
    if (results.length === 0) return { successRate: 0, avgLatency: 0, p95Latency: 0, failCount: 0 };
    const successCount = results.filter((r) => r.status === "success").length;
    const latencies = results.map((r) => r.reducedResponse?.latencyMs ?? 0).sort((a, b) => a - b);
    const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1];

    return {
      successRate: Math.round((successCount / results.length) * 100),
      avgLatency: avg,
      p95Latency: p95,
      failCount: results.length - successCount,
    };
  }, [results]);

  const anomalies = useMemo(
    () => results.filter((r) => r.status === "error" || (r.reducedResponse?.latencyMs ?? 0) > 1000),
    [results]
  );

  const derivedTitle = useMemo(
    () => deriveReportTitle(results.map((r) => ({ method: r.method, url: r.url }))),
    [results]
  );
  const reportTitle = aiReportTitle ?? derivedTitle;

  if (!executionResult) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="text-lg font-bold">No execution data</h3>
          <p className="text-sm text-muted-foreground pb-4">
            Run your pipeline first to generate performance analysis and AI-powered insights.
          </p>
          <button
            type="button"
            onClick={() => usePipelineStore.getState().setView("builder")}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Go to Builder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center w-full overflow-auto custom-scrollbar py-8">
      <div className="w-full max-w-5xl mx-auto bg-white dark:bg-zinc-950/50 rounded-2xl border shadow-sm print:border-none print:shadow-none">
        <ReportHeader pipelineName={pipeline?.name ?? ""} reportTitle={reportTitle} {...stats} />

        <div className="p-8 sm:p-12 space-y-12">
          <ReportExecutiveSummary reportOutput={reportOutput} />

          <ReportAnomalies anomalies={anomalies} />

          <ReportPerformanceTable results={results} />
        </div>
      </div>
    </div>
  );
}
