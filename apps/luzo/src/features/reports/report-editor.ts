import type { JSONContent } from "@tiptap/react";
import { nanoid } from "nanoid";
import { buildHealthSummary } from "@/features/pipeline/report-generation";
import type { StructuredReport } from "@/types/pipeline-debug";

export type ReportEditorSectionKey =
  | "title"
  | "summary"
  | "healthSummary"
  | "insights"
  | "recommendations"
  | "risks"
  | "requests"
  | "conclusion"
  | `request:${string}`
  | `custom:${string}`;

export type ReportTopLevelSectionKey =
  | "summary"
  | "healthSummary"
  | "insights"
  | "recommendations"
  | "risks"
  | "requests"
  | "conclusion"
  | `custom:${string}`;

export function ensureEditableReport(report: StructuredReport): StructuredReport {
  const customSections = report.customSections ?? [];

  return {
    ...report,
    healthSummary:
      report.healthSummary && report.healthSummary.trim().length > 0
        ? report.healthSummary
        : buildHealthSummary(report),
    sectionOrder: sanitizeSectionOrder(
      report.sectionOrder,
      customSections.map((section) => section.id),
    ),
    customSections,
    insights: report.insights ?? [],
    recommendations: report.recommendations ?? [],
    risks: report.risks ?? [],
    requests: report.requests ?? [],
  };
}

export function getDefaultSectionOrder(): Exclude<ReportTopLevelSectionKey, `custom:${string}`>[] {
  return [
    "summary",
    "healthSummary",
    "insights",
    "recommendations",
    "risks",
    "requests",
    "conclusion",
  ];
}

export function reportTextToDoc(text: string): JSONContent {
  const paragraphs = splitParagraphs(text);
  return {
    type: "doc",
    content:
      paragraphs.length > 0
        ? paragraphs.map((paragraph) => ({
            type: "paragraph",
            content: textWithLineBreaks(paragraph),
          }))
        : [{ type: "paragraph" }],
  };
}

export function reportListToDoc(items: string[]): JSONContent {
  const content = items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: textWithLineBreaks(item) }],
    }));

  return {
    type: "doc",
    content:
      content.length > 0
        ? [{ type: "bulletList", content }]
        : [
            {
              type: "bulletList",
              content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
            },
          ],
  };
}

export function serializeDocToText(doc: JSONContent): string {
  return (doc.content ?? [])
    .map(textFromNode)
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function serializeDocToList(doc: JSONContent): string[] {
  const items = flattenListNodes(doc.content ?? [])
    .map((item) => item.trim())
    .filter(Boolean);
  if (items.length > 0) return items;
  return (doc.content ?? [])
    .map(textFromNode)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function updateReportTextSection(
  report: StructuredReport,
  sectionKey: ReportEditorSectionKey,
  nextValue: string,
): StructuredReport {
  const value = nextValue.trim();
  if (sectionKey === "title") return { ...report, title: value || "Untitled Report" };
  if (sectionKey === "summary") return { ...report, summary: value };
  if (sectionKey === "healthSummary") return { ...report, healthSummary: value };
  if (sectionKey === "conclusion") return { ...report, conclusion: value };
  if (sectionKey.startsWith("request:")) {
    const stepId = sectionKey.slice("request:".length);
    return {
      ...report,
      requests: report.requests.map((request) =>
        request.stepId === stepId ? { ...request, analysis: value } : request,
      ),
    };
  }
  if (sectionKey.startsWith("custom:")) {
    const sectionId = sectionKey.slice("custom:".length);
    return {
      ...report,
      customSections: (report.customSections ?? []).map((section) =>
        section.id === sectionId ? { ...section, content: value } : section,
      ),
    };
  }
  return report;
}

export function updateReportCustomSectionMeta(
  report: StructuredReport,
  sectionId: string,
  updates: Partial<Pick<NonNullable<StructuredReport["customSections"]>[number], "title">>,
): StructuredReport {
  return {
    ...report,
    customSections: (report.customSections ?? []).map((section) =>
      section.id === sectionId
        ? {
            ...section,
            ...updates,
            title: (updates.title ?? section.title).trim() || "Untitled Section",
          }
        : section,
    ),
  };
}

export function updateReportListSection(
  report: StructuredReport,
  sectionKey: Extract<ReportEditorSectionKey, "insights" | "recommendations" | "risks">,
  nextItems: string[],
): StructuredReport {
  const items = nextItems.map((item) => item.trim()).filter(Boolean);
  if (sectionKey === "insights") return { ...report, insights: items };
  if (sectionKey === "recommendations") return { ...report, recommendations: items };
  return { ...report, risks: items };
}

export function updateReportSectionOrder(
  report: StructuredReport,
  nextOrder: ReportTopLevelSectionKey[],
): StructuredReport {
  return {
    ...report,
    sectionOrder: sanitizeSectionOrder(
      nextOrder,
      (report.customSections ?? []).map((section) => section.id),
    ),
  };
}

export function addReportCustomSection(report: StructuredReport): StructuredReport {
  const customSection = { id: nanoid(8), title: "New Section", content: "" };
  const baseOrder = sanitizeSectionOrder(
    report.sectionOrder,
    (report.customSections ?? []).map((section) => section.id),
  );
  const conclusionIndex = baseOrder.indexOf("conclusion");
  const nextOrder = [...baseOrder];
  const customKey = `custom:${customSection.id}` as const;
  nextOrder.splice(conclusionIndex >= 0 ? conclusionIndex : nextOrder.length, 0, customKey);

  return {
    ...report,
    customSections: [...(report.customSections ?? []), customSection],
    sectionOrder: sanitizeSectionOrder(nextOrder, [
      ...(report.customSections ?? []).map((section) => section.id),
      customSection.id,
    ]),
  };
}
export function removeReportCustomSection(
  report: StructuredReport,
  sectionId: string,
): StructuredReport {
  const customSections = (report.customSections ?? []).filter(
    (section) => section.id !== sectionId,
  );
  const sectionOrder = (report.sectionOrder ?? []).filter((key) => key !== `custom:${sectionId}`);

  return {
    ...report,
    customSections,
    sectionOrder: sanitizeSectionOrder(
      sectionOrder,
      customSections.map((section) => section.id),
    ),
  };
}
export function buildReportAiContext(report: StructuredReport): string {
  const customSections = (report.customSections ?? [])
    .map((section) => `Custom Section: ${section.title}\n${section.content}`)
    .join("\n\n");

  return [
    `Report Title: ${report.title}`,
    `Executive Summary:\n${report.summary}`,
    `Health Summary:\n${report.healthSummary}`,
    `Insights:\n${report.insights.join("\n")}`,
    `Recommendations:\n${report.recommendations.join("\n")}`,
    `Risks:\n${report.risks.join("\n")}`,
    customSections,
    `Conclusion:\n${report.conclusion}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function splitParagraphs(text: string) {
  return text
    .replaceAll("\r\n", "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function textWithLineBreaks(text: string): JSONContent[] {
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  const content: JSONContent[] = [];
  lines.forEach((line, index) => {
    if (line.length > 0) content.push({ type: "text", text: line });
    if (index < lines.length - 1) content.push({ type: "hardBreak" });
  });
  return content;
}

function textFromNode(node: JSONContent | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "bulletList" || node.type === "orderedList")
    return flattenListNodes(node.content ?? []).join("\n\n");
  return (node.content ?? []).map(textFromNode).join("");
}

function flattenListNodes(nodes: JSONContent[]): string[] {
  return nodes.flatMap((node) => {
    if (node.type === "bulletList" || node.type === "orderedList")
      return flattenListNodes(node.content ?? []);
    if (node.type === "listItem") {
      const value = (node.content ?? []).map(textFromNode).join("\n").trim();
      return value ? [value] : [];
    }
    return [];
  });
}

function sanitizeSectionOrder(
  order: string[] | undefined,
  customSectionIds: string[],
): ReportTopLevelSectionKey[] {
  const fallback = [
    ...getDefaultSectionOrder(),
    ...customSectionIds.map((id) => `custom:${id}` as const),
  ];
  const allowed = new Set<ReportTopLevelSectionKey>(fallback);
  const unique = (order ?? [])
    .filter((key): key is ReportTopLevelSectionKey => allowed.has(key as ReportTopLevelSectionKey))
    .filter((key, index, array) => array.indexOf(key) === index);
  return [...unique, ...fallback.filter((key) => !unique.includes(key))];
}
