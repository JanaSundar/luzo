"use client";

import type { ReportEditorSectionKey } from "@/lib/reports/report-editor";
import type { StructuredReport } from "@/types/pipeline-debug";

export interface ReportEditorProps {
  report: StructuredReport;
  aiConfigured: boolean;
  onChange: (report: StructuredReport) => void;
  onAskAi: (input: {
    sectionKey: ReportEditorSectionKey;
    sectionTitle: string;
    selectedText: string;
    sectionContent: string;
    reportContext: string;
    instruction: string;
  }) => Promise<string>;
}

export interface SelectionOverlayState {
  from: number;
  to: number;
  text: string;
  left: number;
  top: number;
}
