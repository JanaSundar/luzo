"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { generateAIReport } from "@/app/actions/ai-report";
import { buildReducedContext } from "@/lib/pipeline/context-reducer";
import { createReportCache, createReportCacheKey } from "@/lib/pipeline/report-generation";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { usePipelineExecutionStore } from "@/lib/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { exportReport } from "@/lib/utils/export-report-pdf";
import { deriveReportTitle } from "@/lib/utils/report-title";
import type { Pipeline } from "@/types";
import type { ExportFormat } from "@/types/pipeline-debug";

interface UsePipelineReportActionsInput {
  activePipeline: Pipeline | undefined;
  activePipelineId: string | null;
  pipelines: Pipeline[];
}

export function usePipelineReportActions({
  activePipeline,
  activePipelineId,
  pipelines,
}: UsePipelineReportActionsInput) {
  const setGeneratingReport = usePipelineDebugStore((state) => state.setGeneratingReport);
  const setExportingPDF = usePipelineDebugStore((state) => state.setExportingPDF);
  const saveReport = usePipelineDebugStore((state) => state.saveReport);
  const getReport = usePipelineDebugStore((state) => state.getReport);
  const aiProviderConfig = usePipelineDebugStore((state) => state.aiProvider);
  const setView = usePipelineStore((state) => state.setView);

  const handleGenerateReport = useCallback(async () => {
    const { signalGroups, selectedSignals, reportConfig, isReportDirty, aiProvider } =
      usePipelineDebugStore.getState();
    const { executionResult } = usePipelineStore.getState();
    const currentSnapshots = usePipelineExecutionStore.getState().snapshots;

    if (!activePipeline || currentSnapshots.length === 0 || signalGroups.length === 0) {
      toast.error("Run the pipeline first to generate a report");
      return;
    }

    if (!aiProvider.apiKey) {
      toast.error("AI provider not configured. Please add your API key in settings.");
      return;
    }

    setGeneratingReport(true);
    try {
      const context = buildReducedContext(signalGroups, selectedSignals, currentSnapshots);
      const cacheKey = createReportCacheKey(context, reportConfig);
      const cachedReport = getReport(activePipeline.id);

      if (cachedReport?.cacheKey === cacheKey && !isReportDirty) {
        setView("report");
        toast.success("Loaded saved report");
        return;
      }

      const derivedTitle = executionResult
        ? deriveReportTitle(
            executionResult.results.map((result) => ({ method: result.method, url: result.url }))
          )
        : undefined;
      const result = await generateAIReport({
        context,
        config: reportConfig,
        provider: aiProviderConfig,
        derivedTitle,
      });

      saveReport(
        activePipeline.id,
        createReportCache(cacheKey, reportConfig, result.report, result.mode)
      );
      setView("report");
      toast.success("Intelligence report generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Report generation failed");
    } finally {
      setGeneratingReport(false);
    }
  }, [activePipeline, aiProviderConfig, getReport, saveReport, setGeneratingReport, setView]);

  const handleExportReport = useCallback(
    async (format: ExportFormat) => {
      if (!activePipelineId) {
        toast.error("No report data to export. Generate a report first.");
        return;
      }

      const savedReport = getReport(activePipelineId);
      if (!savedReport) {
        toast.error("No report data to export. Generate a report first.");
        return;
      }

      const pipeline = pipelines.find((entry) => entry.id === activePipelineId);
      setExportingPDF(true);
      await new Promise((resolve) => setTimeout(resolve, 50));

      try {
        await exportReport(
          {
            pipelineName: pipeline?.name ?? "Pipeline",
            report: savedReport.report,
            generatedAt: savedReport.generatedAt,
          },
          format
        );
        toast.success(
          format === "pdf"
            ? "PDF downloaded"
            : format === "json"
              ? "JSON downloaded"
              : "Markdown downloaded"
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : `${format.toUpperCase()} export failed`
        );
      } finally {
        setExportingPDF(false);
      }
    },
    [activePipelineId, getReport, pipelines, setExportingPDF]
  );

  return { handleGenerateReport, handleExportReport };
}
