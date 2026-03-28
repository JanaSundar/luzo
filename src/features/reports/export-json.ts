import type { ExportReportModel } from "@/types/pipeline-debug";

export function buildReportJson(model: ExportReportModel) {
  return JSON.stringify(model, null, 2);
}
