import { buildHealthSummary } from "@/lib/pipeline/report-generation";
import type { ExportReportModel, StructuredReport } from "@/types/pipeline-debug";

interface BuildExportReportModelInput {
  pipelineName: string;
  report: StructuredReport;
  generatedAt?: string;
}

export function buildExportReportModel({
  pipelineName,
  report,
  generatedAt,
}: BuildExportReportModelInput): ExportReportModel {
  return {
    title: report.title,
    tone: report.tone,
    pipelineName,
    generatedAt: generatedAt ?? new Date().toISOString(),
    summary: report.summary,
    healthSummary: buildHealthSummary(report),
    metrics: report.metrics,
    requests: report.requests,
    insights: report.insights,
    risks: report.risks,
    recommendations: report.recommendations,
    conclusion: report.conclusion,
  };
}
