/**
 * Barrel re-export for backward-compatible imports.
 * Actual implementations live in ReportLayout, ReportCards, and ReportTable.
 */
export { ReportLayoutContainer, StaticHtml, ReportHeader, ReportStat } from "./ReportLayout";
export { ReportSection, ReportList, RequestCard } from "./ReportCards";
export { PerformanceAppendixTable } from "./ReportTable";
