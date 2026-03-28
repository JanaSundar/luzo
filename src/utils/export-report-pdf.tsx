import {
  createTimestampedFilename,
  downloadTextFile,
  slugifyFilenamePart,
} from "@/features/reports/export-download";
import { buildReportJson } from "@/features/reports/export-json";
import { buildReportMarkdown } from "@/features/reports/export-markdown";
import { buildExportReportModel } from "@/features/reports/export-model";
import type { ExportFormat, StructuredReport } from "@/types/pipeline-debug";

export interface ExportReportOptions {
  pipelineName: string;
  report: StructuredReport;
  generatedAt?: string;
  theme?: "light" | "dark";
}

export async function exportReport(
  options: ExportReportOptions,
  format: ExportFormat,
): Promise<void> {
  const model = buildExportReportModel(options);
  const filenameBase = slugifyFilenamePart(model.title, "api-report");

  if (format === "pdf") {
    const response = await fetch("/api/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(model),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.details || errorData.error || "Failed to generate PDF. Please try again.",
      );
    }

    const blob = await response.blob();
    downloadBlob(blob, createTimestampedFilename(filenameBase, "pdf"));
    return;
  }

  if (format === "json") {
    downloadTextFile(
      buildReportJson(model),
      createTimestampedFilename(filenameBase, "json"),
      "application/json",
    );
    return;
  }

  downloadTextFile(
    buildReportMarkdown(model),
    createTimestampedFilename(filenameBase, "md"),
    "text/markdown",
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
