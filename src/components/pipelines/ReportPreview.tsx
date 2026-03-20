"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
  Lightbulb,
  Play,
  Target,
  Wrench,
} from "lucide-react";
import type { ReactNode, SVGProps } from "react";
import { Fragment, useMemo } from "react";
import { buildExportReportModel } from "@/lib/reports/export-model";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { cn } from "@/lib/utils";
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
      <div className="w-full max-w-4xl mx-auto bg-white dark:bg-zinc-950/50 p-10 sm:p-20 shadow-sm border rounded-sm min-h-screen">
        <header className="space-y-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              {reportModel.title}
            </h1>
          </div>
          <div className="h-px bg-border w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <ReportStat label="Success Rate" value={`${reportModel.metrics.successRate}%`} />
            <ReportStat label="Avg Latency" value={`${reportModel.metrics.avgLatencyMs}ms`} />
            <ReportStat label="P95 Latency" value={`${reportModel.metrics.p95LatencyMs}ms`} />
            <ReportStat label="Failures" value={`${reportModel.metrics.failedSteps}`} />
          </div>
        </header>

        <div className="space-y-16">
          <ReportSection
            title="Executive Summary"
            icon={<Target className="h-5 w-5 text-indigo-500" />}
            content={reportModel.summary}
          />
          <ReportSection
            title="Health Summary"
            icon={<ActivityIcon className="h-5 w-5 text-emerald-500" />}
            content={reportModel.healthSummary}
          />

          <ReportSection
            title="Key Insights"
            icon={<Lightbulb className="h-5 w-5 text-amber-500" />}
            items={reportModel.insights}
          />
          <ReportSection
            title="Recommendations"
            icon={<Info className="h-5 w-5 text-blue-500" />}
            items={reportModel.recommendations}
          />
          <ReportSection
            title="Risks"
            icon={<AlertTriangle className="h-5 w-5 text-rose-500" />}
            items={reportModel.risks}
          />

          <section className="space-y-8">
            <div className="flex items-center gap-3 border-b pb-2">
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
              <h2 className="text-xl font-bold tracking-tight">Per Request Breakdown</h2>
            </div>
            <div className="space-y-6">
              {reportModel.requests.map((req) => (
                <div
                  key={req.stepId}
                  className="group relative rounded-2xl border border-transparent hover:border-border/60 hover:bg-muted/5 p-4 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0",
                        req.method === "GET"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-blue-500/10 text-blue-600"
                      )}
                    >
                      {req.method}
                    </span>
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {req.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-semibold ml-auto">
                      <span
                        className={cn(
                          req.statusCode && req.statusCode < 400
                            ? "text-emerald-500"
                            : "text-rose-500"
                        )}
                      >
                        {req.statusCode ?? "N/A"}
                      </span>
                      <span className="opacity-30">•</span>
                      <span className="text-muted-foreground">{req.latencyMs ?? 0}ms</span>
                    </div>
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground break-all mb-4 px-3 py-1.5 bg-muted/30 rounded-lg">
                    {req.url}
                  </p>
                  <div className="text-sm leading-snug text-foreground/80 pl-4 border-l-2 border-primary/20 italic">
                    <Markdown text={req.analysis} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <ReportSection
            title="Conclusion"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            content={reportModel.conclusion}
          />

          <section className="space-y-4 pt-6 border-t border-dashed">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Performance Appendix
            </h2>
            <ReportPerformanceTable results={reportCache.report.endpointMetrics} />
          </section>
        </div>

        <footer className="mt-6 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
          <span>Generated on {new Date(reportCache.generatedAt).toLocaleString()}</span>
          <span>Project Luzo</span>
        </footer>
      </div>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 p-4 rounded-2xl bg-muted/5 border border-border/10">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-3xl font-black tabular-nums tracking-tighter">{value}</p>
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);

  return (
    <div className="space-y-4">
      {paragraphs.map((para, pIdx) => {
        const parts = para.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={pIdx} className="leading-relaxed">
            {parts.map((part, i) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return (
                  <strong key={i} className="text-primary font-bold bg-primary/5 px-1 rounded">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return <Fragment key={i}>{part}</Fragment>;
            })}
          </p>
        );
      })}
    </div>
  );
}

function ReportSection({
  title,
  icon,
  content,
  items,
}: {
  title: string;
  icon: ReactNode;
  content?: string;
  items?: string[];
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2.5 border-b pb-1.5">
        {icon}
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      </div>
      {content && (
        <div className="text-sm leading-relaxed text-foreground/90 pl-1">
          <Markdown text={content} />
        </div>
      )}
      {items && items.length > 0 && (
        <ul className="grid gap-3">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="flex gap-3 p-3 rounded-xl border border-transparent hover:border-border/40 hover:bg-muted/5 transition-all group"
            >
              <span className="text-primary/40 font-black mt-1 shrink-0">•</span>
              <div className="text-sm leading-relaxed text-foreground/80">
                <Markdown text={item} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {items && items.length === 0 && (
        <p className="text-sm text-muted-foreground italic pl-1">
          No findings available for this section.
        </p>
      )}
    </section>
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
