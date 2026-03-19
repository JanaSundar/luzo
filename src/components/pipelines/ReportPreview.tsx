"use client";

import { Play, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { buildExportReportModel } from "@/lib/reports/export-model";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { ReportExecutiveSummary } from "./ReportExecutiveSummary";
import { ReportHeader } from "./ReportHeader";
import { ReportPerformanceTable } from "./ReportPerformanceTable";

export function ReportPreview() {
  const { pipelines, activePipelineId, executionResult } = usePipelineStore();
  const reportCache = usePipelineDebugStore((state) =>
    activePipelineId ? (state.reportsByPipelineId[activePipelineId] ?? null) : null
  );

  const pipeline = useMemo(
    () => pipelines.find((item) => item.id === activePipelineId),
    [pipelines, activePipelineId]
  );

  const reportModel = reportCache
    ? buildExportReportModel({
        pipelineName: pipeline?.name ?? "Pipeline",
        report: reportCache.report,
        generatedAt: reportCache.generatedAt,
      })
    : null;

  if (!executionResult && !reportModel) {
    return (
      <ReportEmptyState
        icon={<Play className="h-7 w-7" />}
        title="No execution data"
        body="Run your pipeline first to generate a report from the latest execution."
      />
    );
  }

  if (!reportModel || !reportCache) {
    return (
      <ReportEmptyState
        icon={<Wrench className="h-7 w-7" />}
        title="Generate a report"
        body="Execution data is available. Open the AI Configurator or use Generate Report to build the latest narrative."
      />
    );
  }

  return (
    <div className="flex justify-center w-full overflow-auto custom-scrollbar py-8">
      <div className="w-full max-w-5xl mx-auto rounded-2xl border bg-white shadow-sm dark:bg-zinc-950/50">
        <ReportHeader
          pipelineName={reportModel.pipelineName}
          reportTitle={reportModel.title}
          successRate={reportModel.metrics.successRate}
          avgLatency={reportModel.metrics.avgLatencyMs}
          p95Latency={reportModel.metrics.p95LatencyMs}
          failCount={reportModel.metrics.failedSteps}
        />

        <div className="space-y-10 p-8 sm:p-12">
          <ReportExecutiveSummary summary={reportModel.summary} />
          <NarrativeCard title="Health Summary" items={[reportModel.healthSummary]} />
          <RequestBreakdownSection requests={reportModel.requests} />
          <NarrativeGrid
            insights={reportModel.insights}
            risks={reportModel.risks}
            recommendations={reportModel.recommendations}
          />
          <NarrativeCard title="Conclusion" items={[reportModel.conclusion]} />
          <ReportPerformanceTable results={reportCache.report.endpointMetrics} />
        </div>
      </div>
    </div>
  );
}

function ReportEmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-3">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/30 text-muted-foreground/60">
          {icon}
        </div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function NarrativeGrid({
  insights,
  risks,
  recommendations,
}: {
  insights: string[];
  risks: string[];
  recommendations: string[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <NarrativeCard title="Insights" items={insights} />
      <NarrativeCard title="Risks" items={risks} />
      <NarrativeCard title="Recommendations" items={recommendations} />
    </div>
  );
}

function NarrativeCard({ title, items }: { title: string; items: string[] }) {
  const safeItems = items.length > 0 ? items : ["No items available."];
  return (
    <section className="rounded-2xl border bg-background/70 p-6 shadow-sm">
      <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-3">
        {safeItems.map((item, index) => (
          <div
            key={`${title}-${index}`}
            className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm leading-6"
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function RequestBreakdownSection({
  requests,
}: {
  requests: Array<{
    stepId: string;
    name: string;
    method: string;
    url: string;
    statusCode: number | null;
    latencyMs: number | null;
    analysis: string;
  }>;
}) {
  return (
    <section className="space-y-6">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Per Request Breakdown
      </h3>
      <div className="space-y-4">
        {requests.map((request, index) => (
          <div
            key={request.stepId ?? `request-${index}`}
            className="rounded-2xl border p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {request.method}
              </span>
              <span className="text-sm font-semibold">{request.name}</span>
              <span className="text-xs text-muted-foreground">{request.statusCode ?? "N/A"}</span>
              <span className="text-xs text-muted-foreground">{request.latencyMs ?? 0}ms</span>
            </div>
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{request.url}</p>
            <p className="mt-4 text-sm leading-6 text-foreground/90">{request.analysis}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
