"use client";

import { Reorder, useDragControls } from "motion/react";
import type { ReactNode } from "react";
import type { StructuredReport } from "@/types/pipeline-debug";
import { updateReportTextSection } from "@/features/reports/report-editor";
import { updateReportRequestOrder } from "@/features/reports/report-editor-reorder";
import { TextSectionEditorCard } from "./SectionCards";
import { ReorderHandle } from "./ReorderHandle";
import type { ReportEditorProps } from "./types";

interface RequestSectionEditorProps extends ReportEditorProps {
  dragHandle: ReactNode;
  reportContext: string;
}

export function RequestSectionEditor({
  report,
  aiConfigured,
  onChange,
  onAskAi,
  reportContext,
  dragHandle,
}: RequestSectionEditorProps) {
  return (
    <section className="group rounded-[1.5rem] px-2 py-2 transition-colors hover:bg-muted/10">
      <div className="flex items-center gap-3 px-3 pb-2">
        <div className="flex h-8 items-center opacity-55 transition-opacity group-hover:opacity-100">
          {dragHandle}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
            Per Request Breakdown
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Drag request analyses to reorganize the story flow.
          </p>
        </div>
      </div>

      <Reorder.Group
        axis="y"
        values={report.requests.map((request) => request.stepId)}
        onReorder={(orderedStepIds) => onChange(updateReportRequestOrder(report, orderedStepIds))}
        className="space-y-1"
      >
        {report.requests.map((request) => (
          <RequestEditorItem
            key={request.stepId}
            request={request}
            report={report}
            aiConfigured={aiConfigured}
            onChange={onChange}
            onAskAi={onAskAi}
            reportContext={reportContext}
          />
        ))}
      </Reorder.Group>
    </section>
  );
}

function RequestEditorItem({
  request,
  report,
  aiConfigured,
  onChange,
  onAskAi,
  reportContext,
}: {
  request: StructuredReport["requests"][number];
  reportContext: string;
} & ReportEditorProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={request.stepId}
      dragControls={dragControls}
      dragListener={false}
      className="list-none"
    >
      <TextSectionEditorCard
        title={request.name}
        description={`${request.method} ${request.url}`}
        placeholder="Write the request analysis"
        value={request.analysis}
        sectionKey={`request:${request.stepId}`}
        aiConfigured={aiConfigured}
        onChange={(value) =>
          onChange(updateReportTextSection(report, `request:${request.stepId}`, value))
        }
        onAskAi={onAskAi}
        reportContext={reportContext}
        dragHandle={
          <ReorderHandle
            label={`Reorder ${request.name}`}
            onPointerDown={(event) => dragControls.start(event)}
          />
        }
      />
    </Reorder.Item>
  );
}
