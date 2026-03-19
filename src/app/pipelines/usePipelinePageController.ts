"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  buildExecutionArtifact,
  buildExecutionResultFromArtifact,
} from "@/lib/pipeline/execution-artifacts";
import { planPartialPipelineRun } from "@/lib/pipeline/partial-run";
import { usePipelineArtifactsStore } from "@/lib/stores/usePipelineArtifactsStore";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { usePipelineRuntimeStore } from "@/lib/stores/usePipelineRuntimeStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { useProvidersConfigStore } from "@/lib/stores/useProvidersConfigStore";
import { runPipelineSession } from "./run-pipeline-session";
import { usePipelineReportActions } from "./usePipelineReportActions";
export function usePipelinePageController() {
  const pipelines = usePipelineStore((state) => state.pipelines);
  const activePipelineId = usePipelineStore((state) => state.activePipelineId);
  const setExecuting = usePipelineStore((state) => state.setExecuting);
  const setExecutionResult = usePipelineStore((state) => state.setExecutionResult);
  const setView = usePipelineStore((state) => state.setView);
  const runtime = usePipelineRuntimeStore((state) => state.runtime);
  const snapshots = usePipelineRuntimeStore((state) => state.snapshots);
  const runtimeVariables = usePipelineRuntimeStore((state) => state.runtimeVariables);
  const sessionSource = usePipelineRuntimeStore((state) => state.sessionSource);
  const initDebugSession = usePipelineRuntimeStore((state) => state.initDebugSession);
  const continueAll = usePipelineRuntimeStore((state) => state.continueAll);
  const stopExecution = usePipelineRuntimeStore((state) => state.stopExecution);
  const resetSession = usePipelineRuntimeStore((state) => state.resetSession);
  const hydrateFromArtifact = usePipelineRuntimeStore((state) => state.hydrateFromArtifact);
  const refreshSignals = usePipelineDebugStore((state) => state.refreshSignals);
  const setReportConfig = usePipelineDebugStore((state) => state.setReportConfig);
  const setAIProvider = usePipelineDebugStore((state) => state.setAIProvider);
  const getActiveEnvironmentVariables = usePlaygroundStore(
    (state) => state.getActiveEnvironmentVariables
  );
  const providers = useProvidersConfigStore((state) => state.providers);
  const activeProvider = useProvidersConfigStore((state) => state.activeProvider);
  const executionArtifact = usePipelineArtifactsStore((state) =>
    activePipelineId ? (state.executionByPipelineId[activePipelineId] ?? null) : null
  );
  const saveExecutionArtifact = usePipelineArtifactsStore((state) => state.saveExecutionArtifact);

  const activePipeline = pipelines.find((pipeline) => pipeline.id === activePipelineId);
  const lastPersistedRunRef = useRef<string | null>(null);
  const { handleGenerateReport, handleExportReport } = usePipelineReportActions({
    activePipeline,
    activePipelineId,
    pipelines,
  });

  useEffect(() => {
    const config = providers[activeProvider];
    if (!config?.apiKey || config.apiKey.length < 10) return;
    setAIProvider({ provider: activeProvider, model: config.model ?? "", apiKey: config.apiKey });
  }, [activeProvider, providers, setAIProvider]);

  useEffect(() => {
    if (!activePipeline) return;
    const prompt =
      activePipeline.narrativeConfig.promptOverrides?.[activePipeline.narrativeConfig.tone] ??
      activePipeline.narrativeConfig.prompt;
    setReportConfig({
      tone: activePipeline.narrativeConfig.tone,
      prompt,
    });
  }, [activePipeline, setReportConfig]);

  useEffect(() => {
    if (!activePipelineId) {
      hydrateFromArtifact(null);
      setExecutionResult(null);
      return;
    }

    hydrateFromArtifact(executionArtifact);
    setExecutionResult(
      executionArtifact ? buildExecutionResultFromArtifact(executionArtifact) : null
    );
    if (activePipeline) {
      refreshSignals(activePipeline.steps);
    }
  }, [
    activePipeline,
    activePipelineId,
    executionArtifact,
    hydrateFromArtifact,
    refreshSignals,
    setExecutionResult,
  ]);

  useEffect(() => {
    const isDone =
      runtime.status === "completed" || runtime.status === "failed" || runtime.status === "aborted";
    if (!activePipeline || !isDone || snapshots.length === 0 || sessionSource !== "live") {
      return;
    }

    const persistenceKey = `${activePipeline.id}:${runtime.startedAt}:${runtime.completedAt}`;
    if (lastPersistedRunRef.current === persistenceKey) {
      return;
    }

    const artifact = buildExecutionArtifact(activePipeline, snapshots, runtime, runtimeVariables);
    saveExecutionArtifact(activePipeline.id, artifact);
    setExecutionResult(buildExecutionResultFromArtifact(artifact));
    refreshSignals(activePipeline.steps);
    lastPersistedRunRef.current = persistenceKey;
  }, [
    activePipeline,
    refreshSignals,
    runtime,
    runtimeVariables,
    saveExecutionArtifact,
    sessionSource,
    setExecutionResult,
    snapshots,
  ]);

  const handleRun = useCallback(
    async () =>
      runPipelineSession({
        activePipeline,
        getActiveEnvironmentVariables,
        initDebugSession,
        continueAll,
        resetSession,
        setExecuting,
        setExecutionResult,
        setView,
        options: { executionMode: "full" },
        successLabel: "Pipeline executed successfully",
      }),
    [
      activePipeline,
      continueAll,
      getActiveEnvironmentVariables,
      initDebugSession,
      resetSession,
      setExecuting,
      setExecutionResult,
      setView,
    ]
  );

  const handleDebug = useCallback(() => {
    if (!activePipeline) return;
    resetSession();
    setView("stream");
    setExecutionResult(null);
    const init = initDebugSession(activePipeline, getActiveEnvironmentVariables(), {
      executionMode: "full",
    });
    if (!init.valid) {
      toast.error(`Validation failed: ${init.errors?.join(", ")}`);
      return;
    }
    toast.info("Debug mode started — use Step or Continue to execute");
  }, [
    activePipeline,
    getActiveEnvironmentVariables,
    initDebugSession,
    resetSession,
    setExecutionResult,
    setView,
  ]);

  const handleRunFromStep = useCallback(
    async (stepId: string, mode: "partial-previous" | "partial-fresh") => {
      if (!activePipeline) return;
      const artifact = usePipelineArtifactsStore.getState().getExecutionArtifact(activePipeline.id);
      const plan = planPartialPipelineRun({
        pipeline: activePipeline,
        startStepId: stepId,
        mode,
        artifact,
      });
      if (!plan.valid) {
        toast.error(plan.error);
        return;
      }

      await runPipelineSession({
        activePipeline,
        getActiveEnvironmentVariables,
        initDebugSession,
        continueAll,
        resetSession,
        setExecuting,
        setExecutionResult,
        setView,
        options: plan.options,
        successLabel: "Partial pipeline run completed",
      });
    },
    [
      activePipeline,
      continueAll,
      getActiveEnvironmentVariables,
      initDebugSession,
      resetSession,
      setExecuting,
      setExecutionResult,
      setView,
    ]
  );

  const handleStop = useCallback(() => {
    stopExecution();
    setExecuting(false);
  }, [setExecuting, stopExecution]);

  return {
    handleRun,
    handleDebug,
    handleRunFromStep,
    handleStop,
    handleGenerateReport,
    handleExportReport,
  };
}
