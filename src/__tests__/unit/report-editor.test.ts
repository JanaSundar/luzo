import { describe, expect, it } from "vitest";
import {
  addReportCustomSection,
  buildReportAiContext,
  ensureEditableReport,
  reportListToDoc,
  reportTextToDoc,
  serializeDocToList,
  serializeDocToText,
  removeReportCustomSection,
  updateReportListSection,
  updateReportTextSection,
} from "@/lib/reports/report-editor";
import type { StructuredReport } from "@/types/pipeline-debug";

function createReport(): StructuredReport {
  return {
    tone: "technical",
    title: "Checkout Report",
    healthSummary: "Healthy overall.",
    summary: "Initial summary",
    insights: ["Insight A", "Insight B"],
    risks: ["Risk A"],
    recommendations: ["Recommendation A"],
    conclusion: "Final conclusion",
    metrics: {
      totalSteps: 2,
      failedSteps: 0,
      successRate: 100,
      avgLatencyMs: 140,
      p95LatencyMs: 180,
      totalDurationMs: 280,
    },
    endpointMetrics: [
      {
        stepId: "step-1",
        stepName: "Get Cart",
        method: "GET",
        url: "/cart",
        statusCode: 200,
        latencyMs: 120,
        sizeBytes: 512,
        error: null,
        outcome: "success",
      },
    ],
    requests: [
      {
        stepId: "step-1",
        name: "Get Cart",
        method: "GET",
        url: "/cart",
        analysis: "Cart request looks healthy.",
        statusCode: 200,
        latencyMs: 120,
      },
    ],
  };
}

describe("report editor utilities", () => {
  it("serializes narrative paragraphs without losing spacing", () => {
    const doc = reportTextToDoc("Line one\nLine two\n\nLine three");

    expect(serializeDocToText(doc)).toBe("Line one\nLine two\n\nLine three");
  });

  it("serializes editable bullet lists back to string arrays", () => {
    const doc = reportListToDoc(["First item", "Second item"]);

    expect(serializeDocToList(doc)).toEqual(["First item", "Second item"]);
  });

  it("updates only the targeted request analysis section", () => {
    const report = createReport();

    const updated = updateReportTextSection(report, "request:step-1", "Updated analysis");

    expect(updated.requests[0]?.analysis).toBe("Updated analysis");
    expect(updated.summary).toBe(report.summary);
  });

  it("updates list sections without disturbing the rest of the report", () => {
    const report = createReport();

    const updated = updateReportListSection(report, "insights", ["One", "Two", "Three"]);

    expect(updated.insights).toEqual(["One", "Two", "Three"]);
    expect(updated.recommendations).toEqual(report.recommendations);
  });

  it("fills health summary when normalizing editable reports", () => {
    const report = createReport();
    const normalized = ensureEditableReport({ ...report, healthSummary: "" });

    expect(normalized.healthSummary.length).toBeGreaterThan(0);
  });

  it("adds a draggable custom section before conclusion", () => {
    const report = createReport();
    const updated = addReportCustomSection(report);

    expect(updated.customSections).toHaveLength(1);
    expect(updated.sectionOrder?.some((key) => key.startsWith("custom:"))).toBe(true);
    expect(updated.sectionOrder?.at(-1)).toBe("conclusion");
  });

  it("removes custom sections and cleans up section order", () => {
    const report = createReport();
    const withCustom = addReportCustomSection(report);
    const customId = withCustom.customSections![0]!.id;

    const removed = removeReportCustomSection(withCustom, customId);

    expect(removed.customSections).toHaveLength(0);
    expect(removed.sectionOrder?.some((key) => key.startsWith("custom:"))).toBe(false);
  });

  it("builds ai context from the whole report without decorative icons", () => {
    const report = createReport();
    const context = buildReportAiContext(report);

    expect(context).toContain("Report Title: Checkout Report");
    expect(context).toContain("Executive Summary:");
    expect(context).toContain("Conclusion:");
  });
});
