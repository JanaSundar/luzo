import { buildHealthSummary } from "@/lib/pipeline/report-generation";
import type { ExportReportModel, StructuredReport } from "@/types/pipeline-debug";

interface BuildExportReportModelInput {
  pipelineName: string;
  report: StructuredReport;
  generatedAt?: string;
}

function safeArray<T>(arr: T[] | undefined): T[] {
  return arr ?? [];
}

export function buildExportReportModel({
  pipelineName,
  report,
  generatedAt,
}: BuildExportReportModelInput): ExportReportModel {
  return {
    title: report.title ?? "Untitled Report",
    tone: report.tone ?? "technical",
    pipelineName,
    generatedAt: generatedAt ?? new Date().toISOString(),
    summary: report.summary ?? "",
    healthSummary: buildHealthSummary(report),
    metrics: report.metrics ?? {
      totalSteps: 0,
      failedSteps: 0,
      successRate: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      totalDurationMs: 0,
    },
    requests: safeArray(report.requests),
    insights: safeArray(report.insights),
    risks: safeArray(report.risks),
    recommendations: safeArray(report.recommendations),
    conclusion: report.conclusion ?? "",
  };
}
