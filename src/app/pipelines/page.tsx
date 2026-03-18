"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { generateAIReport } from "@/app/actions/ai-report";
import { AIConfigurator } from "@/components/pipelines/AIConfigurator";
import { PipelineBuilder } from "@/components/pipelines/PipelineBuilder";
import { PipelineLayout } from "@/components/pipelines/PipelineLayout";
import { ReportPreview } from "@/components/pipelines/ReportPreview";
import { ResponseStream } from "@/components/pipelines/ResponseStream";
import { buildReducedContext } from "@/lib/pipeline/context-reducer";
import { deriveReportTitle } from "@/lib/utils/report-title";
import { exportReportToPDF } from "@/lib/utils/export-report-pdf";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { useProvidersConfigStore } from "@/lib/stores/useProvidersConfigStore";

export default function PipelinesPage() {
  const pipelines = usePipelineStore((s) => s.pipelines);
  const activePipelineId = usePipelineStore((s) => s.activePipelineId);
  const currentView = usePipelineStore((s) => s.currentView);
  const isExecuting = usePipelineStore((s) => s.isExecuting);
  const setExecuting = usePipelineStore((s) => s.setExecuting);
  const setExecutionResult = usePipelineStore((s) => s.setExecutionResult);
  const setView = usePipelineStore((s) => s.setView);
  const addPipeline = usePipelineStore((s) => s.addPipeline);

  const runtime = usePipelineDebugStore((s) => s.runtime);
  const initDebugSession = usePipelineDebugStore((s) => s.initDebugSession);
  const continueAll = usePipelineDebugStore((s) => s.continueAll);
  const stopExecution = usePipelineDebugStore((s) => s.stopExecution);
  const resetSession = usePipelineDebugStore((s) => s.resetSession);
  const refreshSignals = usePipelineDebugStore((s) => s.refreshSignals);
  const snapshots = usePipelineDebugStore((s) => s.snapshots);
  const setGeneratingReport = usePipelineDebugStore((s) => s.setGeneratingReport);
  const setExportingPDF = usePipelineDebugStore((s) => s.setExportingPDF);
  const setReportOutput = usePipelineDebugStore((s) => s.setReportOutput);
  const aiProviderConfig = usePipelineDebugStore((s) => s.aiProvider);

  const getActiveEnvironmentVariables = usePlaygroundStore((s) => s.getActiveEnvironmentVariables);

  const activePipeline = pipelines.find((p) => p.id === activePipelineId);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Wait for Zustand persist rehydration before creating a default pipeline.
  // Without this, a refresh would always create a new pipeline before
  // localStorage state is restored.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = usePipelineStore.persist.onFinishHydration(() => setHydrated(true));
    if (usePipelineStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated && pipelines.length === 0) {
      addPipeline("API Pipeline");
    }
  }, [hydrated, pipelines.length, addPipeline]);

  // Sync AI provider from settings (useProvidersConfigStore) to report generation (usePipelineDebugStore)
  // so report uses the configured provider even when user goes directly to pipelines
  const providers = useProvidersConfigStore((s) => s.providers);
  const activeProvider = useProvidersConfigStore((s) => s.activeProvider);
  const setAIProvider = usePipelineDebugStore((s) => s.setAIProvider);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const config = providers[activeProvider];
    if (config?.apiKey && config.apiKey.length >= 10) {
      setAIProvider({
        provider: activeProvider,
        model: config.model ?? "",
        apiKey: config.apiKey,
      });
    }
  }, [providers, activeProvider, setAIProvider]);

  useEffect(() => {
    const isDone =
      runtime.status === "completed" || runtime.status === "failed" || runtime.status === "aborted";

    if (isDone && snapshots.length > 0 && activePipeline) {
      refreshSignals(activePipeline.steps);

      // Populate executionResult so ReportPreview has data (for both Run and Debug flows)
      const requestSnapshots = snapshots.filter(
        (s) => s.reducedResponse && s.status !== "pending" && s.status !== "running"
      );
      if (requestSnapshots.length > 0) {
        setExecutionResult({
          pipelineId: activePipeline.id,
          startTime: requestSnapshots[0]?.startedAt ?? new Date().toISOString(),
          endTime:
            requestSnapshots[requestSnapshots.length - 1]?.completedAt ?? new Date().toISOString(),
          status:
            runtime.status === "completed"
              ? "completed"
              : runtime.status === "failed"
                ? "failed"
                : "running",
          results: requestSnapshots.map((s) => ({
            stepId: s.stepId,
            stepName: s.stepName,
            method: s.method,
            url: s.url,
            status: s.reducedResponse!.status,
            statusText: s.reducedResponse!.statusText,
            headers: s.fullHeaders ?? s.reducedResponse!.headers ?? {},
            body: s.fullBody ?? JSON.stringify(s.reducedResponse!.summary ?? {}),
            time: s.reducedResponse!.latencyMs ?? 0,
            size: s.reducedResponse!.sizeBytes ?? 0,
          })),
        });
      }
    }
  }, [runtime.status, snapshots, activePipeline, refreshSignals, setExecutionResult]);

  const handleRun = useCallback(async () => {
    if (!activePipeline || isExecuting) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setExecuting(true);
    setExecutionResult(null);
    resetSession();
    setView("stream");

    try {
      const envVars = getActiveEnvironmentVariables();

      const init = initDebugSession(activePipeline, envVars);
      if (!init.valid) {
        toast.error(`Validation failed: ${init.errors?.join(", ")}`);
        setExecuting(false);
        return;
      }

      await continueAll();

      // Populate executionResult from snapshots so ReportPreview has data
      const { snapshots: completedSnapshots, runtime: completedRuntime } =
        usePipelineDebugStore.getState();
      const requestSnapshots = completedSnapshots.filter(
        (s) => s.reducedResponse && s.status !== "pending" && s.status !== "running"
      );
      if (requestSnapshots.length > 0 && activePipeline) {
        setExecutionResult({
          pipelineId: activePipeline.id,
          startTime: requestSnapshots[0]?.startedAt ?? new Date().toISOString(),
          endTime:
            requestSnapshots[requestSnapshots.length - 1]?.completedAt ?? new Date().toISOString(),
          status:
            completedRuntime.status === "completed"
              ? "completed"
              : completedRuntime.status === "failed"
                ? "failed"
                : "running",
          results: requestSnapshots.map((s) => ({
            stepId: s.stepId,
            stepName: s.stepName,
            method: s.method,
            url: s.url,
            status: s.reducedResponse!.status,
            statusText: s.reducedResponse!.statusText,
            headers: s.fullHeaders ?? s.reducedResponse!.headers ?? {},
            body: s.fullBody ?? JSON.stringify(s.reducedResponse!.summary ?? {}),
            time: s.reducedResponse!.latencyMs ?? 0,
            size: s.reducedResponse!.sizeBytes ?? 0,
          })),
        });
      }

      toast.success("Pipeline executed successfully");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error(message);
    } finally {
      setExecuting(false);
      abortControllerRef.current = null;
    }
  }, [
    activePipeline,
    isExecuting,
    setExecuting,
    setExecutionResult,
    resetSession,
    setView,
    getActiveEnvironmentVariables,
    initDebugSession,
    continueAll,
  ]);

  const handleDebug = useCallback(() => {
    if (!activePipeline) return;

    resetSession();
    setView("stream");

    const envVars = getActiveEnvironmentVariables();
    const init = initDebugSession(activePipeline, envVars);

    if (!init.valid) {
      toast.error(`Validation failed: ${init.errors?.join(", ")}`);
      return;
    }

    toast.info("Debug mode started — use Step or Continue to execute");
  }, [activePipeline, resetSession, setView, getActiveEnvironmentVariables, initDebugSession]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    stopExecution();
    setExecuting(false);
  }, [stopExecution, setExecuting]);

  const handleGenerateReport = useCallback(async () => {
    const { signalGroups, selectedSignals, snapshots, reportConfig } =
      usePipelineDebugStore.getState();
    const { executionResult } = usePipelineStore.getState();
    if (snapshots.length === 0 || signalGroups.length === 0) {
      toast.error("Run the pipeline first to generate a report");
      return;
    }
    setGeneratingReport(true);
    try {
      const context = buildReducedContext(signalGroups, selectedSignals, snapshots, {
        maskSensitive: true,
      });
      const derivedTitle = executionResult
        ? deriveReportTitle(executionResult.results.map((r) => ({ method: r.method, url: r.url })))
        : undefined;
      const result = await generateAIReport({
        context,
        config: reportConfig,
        provider: aiProviderConfig,
        derivedTitle,
      });
      setReportOutput(result.output, result.reportTitle);
      setView("report");
      toast.success("Intelligence report generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Report generation failed");
    } finally {
      setGeneratingReport(false);
    }
  }, [aiProviderConfig, setGeneratingReport, setReportOutput, setView]);

  const handleExportPDF = useCallback(async () => {
    const { reportOutput, reportTitle: aiReportTitle } = usePipelineDebugStore.getState();
    const { executionResult } = usePipelineStore.getState();

    if (!executionResult || !reportOutput) {
      toast.error("No report data to export. Generate a report first.");
      return;
    }

    const pipeline = pipelines.find((p) => p.id === executionResult.pipelineId);
    const derivedTitle = deriveReportTitle(
      executionResult.results.map((r) => ({ method: r.method, url: r.url }))
    );
    const reportTitle = aiReportTitle ?? derivedTitle;

    setExportingPDF(true);
    await new Promise((r) => setTimeout(r, 50));

    try {
      await exportReportToPDF({
        pipelineName: pipeline?.name ?? "Pipeline",
        reportTitle,
        reportOutput,
        executionResult,
      });
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF export failed");
    } finally {
      setExportingPDF(false);
    }
  }, [pipelines, setExportingPDF]);

  return (
    <PipelineLayout
      onRun={handleRun}
      onDebug={handleDebug}
      onStop={handleStop}
      onGenerateReport={handleGenerateReport}
      onExportPDF={handleExportPDF}
    >
      {currentView === "builder" && <PipelineBuilder />}
      {currentView === "stream" && <ResponseStream />}
      {currentView === "ai-config" && <AIConfigurator />}
      {currentView === "report" && <ReportPreview />}
    </PipelineLayout>
  );
}
