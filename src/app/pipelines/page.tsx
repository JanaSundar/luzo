"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AIConfigurator } from "@/components/pipelines/AIConfigurator";
import { PipelineBuilder } from "@/components/pipelines/PipelineBuilder";
import { PipelineLayout } from "@/components/pipelines/PipelineLayout";
import { ReportPreview } from "@/components/pipelines/ReportPreview";
import { ResponseStream } from "@/components/pipelines/ResponseStream";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";

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

  useEffect(() => {
    const isDone =
      runtime.status === "completed" || runtime.status === "failed" || runtime.status === "aborted";

    if (isDone && snapshots.length > 0 && activePipeline) {
      refreshSignals(activePipeline.steps);
    }
  }, [runtime.status, snapshots.length, activePipeline, refreshSignals]);

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
    setGeneratingReport(true);
    // Mock generation for now - matches logic in ReportPreview
    setTimeout(() => {
      setReportOutput(
        `# API Intelligence Summary\n\n## Overview\nThe pipeline **${activePipeline?.name}** was executed successfully. All endpoints responded within expected parameters, though some latency spikes were observed in downstream services.\n\n## Key Findings\n- **Latency Stability**: Majority of requests completed under 500ms.\n- **Data Consistency**: JSON schemas were validated across all steps.\n- **Recommendations**: Monitor the /recipes endpoint for potential optimization as it approached the P95 threshold.\n\n### Narrative Summary\n*Generation triggered at ${new Date().toLocaleTimeString()} using ${aiProviderConfig.model} (AI Generated)*`
      );
      setGeneratingReport(false);
      toast.success("Intelligence report generated");
    }, 1500);
  }, [activePipeline?.name, aiProviderConfig.model, setGeneratingReport, setReportOutput]);

  const handleExportPDF = useCallback(() => {
    window.print();
  }, []);

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
