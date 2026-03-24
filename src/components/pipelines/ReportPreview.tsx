"use client";

import { FileSearch, Play, Wrench } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { editReportSelection } from "@/app/actions/ai-report";
import { ReportEditor } from "@/components/pipelines/report/ReportEditor";
import { ReportPreviewContent } from "@/components/pipelines/report/ReportPreviewContent";
import { buildExportReportModel } from "@/lib/reports/export-model";
import { ensureEditableReport, type ReportEditorSectionKey } from "@/lib/reports/report-editor";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/lib/ui/segmentedTabs";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

type ReportWorkspaceTab = "editor" | "preview";

export function ReportPreview() {
  const { pipelines, activePipelineId, executionResult } = usePipelineStore();
  const { resolvedTheme } = useTheme();
  const activeTheme = resolvedTheme === "light" ? "light" : "dark";
  const { saveReport, aiProvider, reportConfig } = usePipelineDebugStore();
  const reportCache = usePipelineDebugStore((state) =>
    activePipelineId ? (state.reportsByPipelineId[activePipelineId] ?? null) : null,
  );
  const pipeline = useMemo(
    () => pipelines.find((entry) => entry.id === activePipelineId),
    [pipelines, activePipelineId],
  );
  const [activeTab, setActiveTab] = useState<ReportWorkspaceTab>("preview");
  const [draftReport, setDraftReport] = useState(() =>
    reportCache ? ensureEditableReport(reportCache.report) : null,
  );
  const lastLocalPersistAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (!reportCache) {
      setDraftReport(null);
      return;
    }

    if (reportCache.generatedAt === lastLocalPersistAtRef.current) {
      return;
    }

    setDraftReport(ensureEditableReport(reportCache.report));
  }, [activePipelineId, reportCache]);

  const editableReport = useMemo(
    () => (draftReport ? ensureEditableReport(draftReport) : null),
    [draftReport],
  );
  const reportModel = useMemo(
    () =>
      editableReport
        ? buildExportReportModel({
            pipelineName: pipeline?.name ?? "Pipeline",
            report: editableReport,
            generatedAt: reportCache?.generatedAt,
            theme: activeTheme as "light" | "dark",
          })
        : null,
    [activeTheme, editableReport, pipeline, reportCache?.generatedAt],
  );

  const persistReport = useCallback(
    (nextReport: NonNullable<typeof editableReport>) => {
      if (!activePipelineId || !reportCache || !nextReport) return;

      const generatedAt = new Date().toISOString();
      lastLocalPersistAtRef.current = generatedAt;
      setDraftReport(nextReport);

      startTransition(() => {
        saveReport(activePipelineId, {
          ...reportCache,
          report: nextReport,
          generatedAt,
        });
      });
    },
    [activePipelineId, reportCache, saveReport],
  );

  const handleAskAi = useCallback(
    async (input: {
      sectionKey: ReportEditorSectionKey;
      sectionTitle: string;
      selectedText: string;
      sectionContent: string;
      reportContext: string;
      instruction: string;
    }) => {
      const result = await editReportSelection({
        ...input,
        provider: aiProvider,
        config: reportConfig,
      });
      return result.replacement;
    },
    [aiProvider, reportConfig],
  );

  if (!executionResult && !reportModel) {
    return (
      <ReportEmptyState
        icon={<Play className="h-7 w-7" />}
        title="No execution data"
        body="Run your pipeline first to generate a report."
      />
    );
  }

  if (!reportCache || !editableReport || !reportModel) {
    return (
      <ReportEmptyState
        icon={<Wrench className="h-7 w-7" />}
        title="Generate a report"
        body="Execution data is available. Use AI Configurator to build the narrative."
      />
    );
  }

  return (
    <div className="custom-scrollbar flex h-full w-full flex-1 flex-col overflow-auto bg-background/50">
      <div className="sticky top-0 z-10 border-b border-border/40 bg-background/85 px-6 py-4 backdrop-blur">
        <div className="flex justify-center">
          <div className={cn("inline-flex", segmentedTabListClassName)}>
            {(["editor", "preview"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={segmentedTabTriggerClassName(
                  activeTab === tab,
                  "h-9 min-w-28 px-4 text-xs font-semibold capitalize",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "editor" ? (
        <ReportEditor
          report={editableReport}
          aiConfigured={Boolean(aiProvider.apiKey)}
          onChange={persistReport}
          onAskAi={handleAskAi}
        />
      ) : (
        <ReportPreviewContent report={reportModel} generatedAt={reportCache.generatedAt} />
      )}
    </div>
  );
}

function ReportEmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md space-y-4 rounded-[1.6rem] border border-border/50 bg-background/80 p-8 text-center shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border/50 bg-muted/20 text-muted-foreground/70">
          {icon}
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          <FileSearch className="h-3.5 w-3.5" />
          Report Preview
        </div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
