"use client";

import { Reorder, useDragControls } from "motion/react";
import type { ReactNode } from "react";
import {
  addReportCustomSection,
  buildReportAiContext,
  ensureEditableReport,
  removeReportCustomSection,
  updateReportCustomSectionMeta,
  updateReportListSection,
  updateReportSectionOrder,
  updateReportTextSection,
  type ReportTopLevelSectionKey,
} from "@/lib/reports/report-editor";
import { CustomSectionEditorCard } from "./report-editor/CustomSectionEditorCard";
import { ListSectionEditorCard, TextSectionEditorCard } from "./report-editor/SectionCards";
import { ReorderHandle } from "./report-editor/ReorderHandle";
import type { ReportEditorProps } from "./report-editor/types";

export function ReportEditor({ report, aiConfigured, onChange, onAskAi }: ReportEditorProps) {
  const editableReport = ensureEditableReport(report);
  const reportContext = buildReportAiContext(editableReport);
  const orderedSections = (
    (editableReport.sectionOrder ?? []) as ReportTopLevelSectionKey[]
  ).filter((sectionKey) => sectionKey !== "requests");

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <article className="rounded-[2rem] bg-background px-6 py-6">
        <div className="pb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-muted-foreground">
            Report Editor
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Write in a clean document view, drag sections to rearrange, and use Ask AI on any
            selected text.
          </p>
        </div>

        <div className="pt-6">
          <TextSectionEditorCard
            title="Title"
            placeholder="Untitled report"
            value={editableReport.title}
            sectionKey="title"
            aiConfigured={aiConfigured}
            onChange={(value) => onChange(updateReportTextSection(editableReport, "title", value))}
            onAskAi={onAskAi}
            reportContext={reportContext}
            titleStyle="text-[2.5rem] font-semibold tracking-tight text-foreground"
          />
        </div>

        <Reorder.Group
          axis="y"
          values={orderedSections}
          onReorder={(nextOrder) => onChange(updateReportSectionOrder(editableReport, nextOrder))}
          className="mt-3 flex flex-col gap-2"
        >
          {orderedSections.map((sectionKey) => (
            <EditorSectionItem
              key={sectionKey}
              sectionKey={sectionKey}
              report={editableReport}
              aiConfigured={aiConfigured}
              onChange={onChange}
              onAskAi={onAskAi}
              reportContext={reportContext}
            />
          ))}
        </Reorder.Group>

        <div className="pt-4">
          <button
            type="button"
            className="inline-flex h-10 items-center rounded-full border border-border/50 px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            onClick={() => onChange(addReportCustomSection(editableReport))}
          >
            Add new section
          </button>
        </div>
      </article>
    </div>
  );
}

function EditorSectionItem({
  sectionKey,
  report,
  aiConfigured,
  onChange,
  onAskAi,
  reportContext,
}: ReportEditorProps & {
  sectionKey: ReportTopLevelSectionKey;
  reportContext: string;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={sectionKey}
      dragControls={dragControls}
      dragListener={false}
      className="list-none"
    >
      <EditorSection
        sectionKey={sectionKey}
        report={report}
        aiConfigured={aiConfigured}
        onChange={onChange}
        onAskAi={onAskAi}
        reportContext={reportContext}
        dragHandle={
          <ReorderHandle
            label={`Reorder ${sectionKey}`}
            onPointerDown={(event) => dragControls.start(event)}
          />
        }
      />
    </Reorder.Item>
  );
}

function EditorSection({
  sectionKey,
  report,
  aiConfigured,
  onChange,
  onAskAi,
  reportContext,
  dragHandle,
}: ReportEditorProps & {
  sectionKey: ReportTopLevelSectionKey;
  reportContext: string;
  dragHandle: ReactNode;
}) {
  if (sectionKey === "summary") {
    return (
      <TextSectionEditorCard
        title="Executive Summary"
        placeholder="Summarize the run and highlight the most important outcomes."
        value={report.summary}
        sectionKey="summary"
        aiConfigured={aiConfigured}
        onChange={(value) => onChange(updateReportTextSection(report, "summary", value))}
        onAskAi={onAskAi}
        reportContext={reportContext}
        dragHandle={dragHandle}
      />
    );
  }

  if (sectionKey === "healthSummary") {
    return (
      <TextSectionEditorCard
        title="Health Summary"
        placeholder="Describe pipeline health, reliability, and stability."
        value={report.healthSummary}
        sectionKey="healthSummary"
        aiConfigured={aiConfigured}
        onChange={(value) => onChange(updateReportTextSection(report, "healthSummary", value))}
        onAskAi={onAskAi}
        reportContext={reportContext}
        dragHandle={dragHandle}
      />
    );
  }

  if (sectionKey === "insights" || sectionKey === "recommendations" || sectionKey === "risks") {
    const titleMap = {
      insights: "Key Insights",
      recommendations: "Recommendations",
      risks: "Risks",
    } as const;
    const placeholderMap = {
      insights: "Add a key insight",
      recommendations: "Add a recommendation",
      risks: "Add a risk",
    } as const;

    return (
      <ListSectionEditorCard
        title={titleMap[sectionKey]}
        placeholder={placeholderMap[sectionKey]}
        items={report[sectionKey]}
        sectionKey={sectionKey}
        aiConfigured={aiConfigured}
        onChange={(items) => onChange(updateReportListSection(report, sectionKey, items))}
        onAskAi={onAskAi}
        reportContext={reportContext}
        dragHandle={dragHandle}
      />
    );
  }

  if (sectionKey.startsWith("custom:")) {
    const customSectionKey = sectionKey as `custom:${string}`;
    const customSection = report.customSections?.find(
      (section) => section.id === sectionKey.slice("custom:".length),
    );

    if (!customSection) return null;

    return (
      <CustomSectionEditorCard
        aiConfigured={aiConfigured}
        onAskAi={onAskAi}
        onContentChange={(value) => onChange(updateReportTextSection(report, sectionKey, value))}
        onRemove={() => onChange(removeReportCustomSection(report, customSection.id))}
        onTitleChange={(title) =>
          onChange(updateReportCustomSectionMeta(report, customSection.id, { title }))
        }
        reportContext={reportContext}
        section={customSection}
        sectionKey={customSectionKey}
        dragHandle={dragHandle}
      />
    );
  }

  return (
    <TextSectionEditorCard
      title="Conclusion"
      placeholder="Close with the final assessment and next steps."
      value={report.conclusion}
      sectionKey="conclusion"
      aiConfigured={aiConfigured}
      onChange={(value) => onChange(updateReportTextSection(report, "conclusion", value))}
      onAskAi={onAskAi}
      reportContext={reportContext}
      dragHandle={dragHandle}
    />
  );
}
