/**
 * Export pipeline report to PDF using @react-pdf/renderer.
 * PDF UI matches the website design.
 */

import { pdf } from "@react-pdf/renderer";
import { ReportPdfDocument } from "@/components/pipelines/ReportPdfDocument";
import { deriveReportTitle } from "@/lib/utils/report-title";
import type { PipelineExecutionResult } from "@/types";

export interface ExportReportOptions {
  pipelineName: string;
  reportTitle?: string;
  reportOutput: string;
  executionResult: PipelineExecutionResult;
}

/** Generate short slug for filename from report title (max ~25 chars) */
function getShortTitle(reportTitle: string): string {
  const slug = reportTitle
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 25);
  return slug || "api-report";
}

/** Generate filename: {shortTitle}-{timestamp}.pdf */
function getExportFilename(reportTitle: string): string {
  const shortTitle = getShortTitle(reportTitle);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${shortTitle}-${timestamp}.pdf`;
}

/**
 * Export the report to PDF with website-matching styling.
 */
export async function exportReportToPDF(options: ExportReportOptions): Promise<void> {
  const { pipelineName, reportTitle: customTitle, reportOutput, executionResult } = options;

  const reportTitle =
    customTitle ??
    deriveReportTitle(executionResult.results.map((r) => ({ method: r.method, url: r.url })));

  const blob = await pdf(
    <ReportPdfDocument
      reportTitle={reportTitle}
      pipelineName={pipelineName}
      reportOutput={reportOutput}
      executionResult={executionResult}
    />
  ).toBlob();

  const filename = getExportFilename(reportTitle);

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
