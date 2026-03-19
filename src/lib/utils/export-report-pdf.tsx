import { pdf } from "@react-pdf/renderer";
import { ReportPdfDocument } from "@/components/pipelines/ReportPdfDocument";
import {
  createTimestampedFilename,
  downloadTextFile,
  slugifyFilenamePart,
} from "@/lib/reports/export-download";
import { buildReportJson } from "@/lib/reports/export-json";
import { buildReportMarkdown } from "@/lib/reports/export-markdown";
import { buildExportReportModel } from "@/lib/reports/export-model";
import type { ExportFormat, StructuredReport } from "@/types/pipeline-debug";

export interface ExportReportOptions {
  pipelineName: string;
  report: StructuredReport;
  generatedAt?: string;
}

export async function exportReport(
  options: ExportReportOptions,
  format: ExportFormat
): Promise<void> {
  const model = buildExportReportModel(options);
  const filenameBase = slugifyFilenamePart(model.title, "api-report");

  if (format === "pdf") {
    const blob = await pdf(<ReportPdfDocument report={model} />).toBlob();
    downloadBlob(blob, createTimestampedFilename(filenameBase, "pdf"));
    return;
  }

  if (format === "json") {
    downloadTextFile(
      buildReportJson(model),
      createTimestampedFilename(filenameBase, "json"),
      "application/json"
    );
    return;
  }

  downloadTextFile(
    buildReportMarkdown(model),
    createTimestampedFilename(filenameBase, "md"),
    "text/markdown"
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
