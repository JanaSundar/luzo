"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileSearch,
  Info,
  Lightbulb,
  Play,
  Target,
  Wrench,
} from "lucide-react";
import React, { type ReactNode, type SVGProps, useMemo } from "react";
import { buildExportReportModel } from "@/lib/reports/export-model";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { Streamdown } from "streamdown";
import { useTheme } from "next-themes";
import {
  ReportLayoutContainer,
  ReportHeader,
  ReportStat,
  ReportSection,
  ReportList,
  RequestCard,
  PerformanceAppendixTable,
} from "./report/ReportShared";

export function ReportPreview() {
  const { pipelines, activePipelineId, executionResult } = usePipelineStore();
  const { resolvedTheme } = useTheme();
  const activeTheme = resolvedTheme === "light" ? "light" : "dark";

  const reportCache = usePipelineDebugStore((state) =>
    activePipelineId ? (state.reportsByPipelineId[activePipelineId] ?? null) : null,
  );

  const pipeline = useMemo(
    () => pipelines.find((item) => item.id === activePipelineId),
    [pipelines, activePipelineId],
  );

  const reportModel = useMemo(
    () =>
      reportCache
        ? buildExportReportModel({
            pipelineName: pipeline?.name ?? "Pipeline",
            report: reportCache.report,
            generatedAt: reportCache.generatedAt,
            theme: activeTheme as "light" | "dark",
          })
        : null,
    [reportCache, pipeline, activeTheme],
  );

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
    <div className="custom-scrollbar flex-1 w-full overflow-auto bg-background/50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <ReportLayoutContainer>
          <ReportHeader title={reportModel.title}>
            <ReportStat label="Success Rate" value={`${reportModel.metrics.successRate}%`} />
            <ReportStat label="Avg Latency" value={`${reportModel.metrics.avgLatencyMs}ms`} />
            <ReportStat label="P95 Latency" value={`${reportModel.metrics.p95LatencyMs}ms`} />
            <ReportStat label="Failures" value={`${reportModel.metrics.failedSteps}`} />
          </ReportHeader>

          <div className="space-y-12">
            <ReportSection title="Executive Summary" icon={<Target className="h-4 w-4" />}>
              <Streamdown>{reportModel.summary}</Streamdown>
            </ReportSection>

            <ReportSection title="Health Summary" icon={<ActivityIcon className="h-4 w-4" />}>
              <Streamdown>{reportModel.healthSummary}</Streamdown>
            </ReportSection>

            <ReportSection title="Key Insights" icon={<Lightbulb className="h-4 w-4" />}>
              <ReportList
                items={reportModel.insights.map((item, idx) => (
                  <Streamdown key={idx}>{item}</Streamdown>
                ))}
              />
            </ReportSection>

            <ReportSection title="Recommendations" icon={<Info className="h-4 w-4" />}>
              <ReportList
                items={reportModel.recommendations.map((item, idx) => (
                  <Streamdown key={idx}>{item}</Streamdown>
                ))}
              />
            </ReportSection>

            <ReportSection title="Risks" icon={<AlertTriangle className="h-4 w-4" />}>
              <ReportList
                items={reportModel.risks.map((item, idx) => (
                  <Streamdown key={idx}>{item}</Streamdown>
                ))}
              />
            </ReportSection>

            <ReportSection
              title="Per Request Breakdown"
              icon={<ChevronRight className="h-4 w-4" />}
            >
              <div className="space-y-4">
                {reportModel.requests.map((req) => (
                  <RequestCard
                    key={req.stepId}
                    method={req.method}
                    name={req.name}
                    statusCode={req.statusCode}
                    latencyMs={req.latencyMs}
                    url={req.url}
                  >
                    <Streamdown>{req.analysis}</Streamdown>
                  </RequestCard>
                ))}
              </div>
            </ReportSection>

            <ReportSection title="Conclusion" icon={<CheckCircle2 className="h-4 w-4" />}>
              <Streamdown>{reportModel.conclusion}</Streamdown>
            </ReportSection>

            <ReportSection title="Performance Appendix" icon={<ActivityIcon className="h-4 w-4" />}>
              <PerformanceAppendixTable metrics={reportModel.endpointMetrics} />
            </ReportSection>
          </div>

          <footer className="mt-12 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
            <span>Generated on {new Date(reportCache.generatedAt).toLocaleString()}</span>
          </footer>
        </ReportLayoutContainer>
      </div>
    </div>
  );
}

function ActivityIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Health Activity Icon</title>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function ReportEmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md space-y-4 rounded-[1.6rem] border border-border/50 bg-background/80 p-8 text-center shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border/50 bg-muted/20 text-muted-foreground/70">
          {icon}
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          <FileSearch className="h-3.5 w-3.5" />
          Report Preview
        </div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
