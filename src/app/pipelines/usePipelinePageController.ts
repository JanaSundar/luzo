"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ArtifactInput } from "@/lib/pipeline/partial-run";
import { planPartialPipelineRun } from "@/lib/pipeline/partial-run";
import type { CheckpointArtifact } from "@/lib/pipeline/pipeline-persistence";
import {
  buildCheckpointArtifact,
  restoreFromCheckpoint,
} from "@/lib/pipeline/pipeline-persistence";
import { useDebugController } from "@/lib/pipeline/use-debug-controller";
import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";
import { usePipelineArtifactsStore } from "@/lib/stores/usePipelineArtifactsStore";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { usePipelineExecutionStore } from "@/lib/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import { usePipelineReportActions } from "./usePipelineReportActions";

export function usePipelinePageController() {
  const pipelines = usePipelineStore((state) => state.pipelines);
  const activePipelineId = usePipelineStore((state) => state.activePipelineId);
  const setExecuting = usePipelineStore((state) => state.setExecuting);
  const setExecutionResult = usePipelineStore((state) => state.setExecutionResult);
  const setView = usePipelineStore((state) => state.setView);

  const snapshots = usePipelineExecutionStore((s) => s.snapshots);
  const status = usePipelineExecutionStore((s) => s.status);
  const runtimeVariables = usePipelineExecutionStore((s) => s.runtimeVariables);
  const executionId = usePipelineExecutionStore((s) => s.executionId);
  const completedAt = usePipelineExecutionStore((s) => s.completedAt);
  const currentStepIndex = usePipelineExecutionStore((s) => s.currentStepIndex);
  const totalSteps = usePipelineExecutionStore((s) => s.totalSteps);
  const errorMessage = usePipelineExecutionStore((s) => s.errorMessage);
  const resetExecution = usePipelineExecutionStore((s) => s.reset);
  const applyControllerSnapshot = usePipelineExecutionStore((s) => s.applyControllerSnapshot);
  const setHasPersistedExecution = usePipelineExecutionStore((s) => s.setHasPersistedExecution);

  const refreshSignals = usePipelineDebugStore((state) => state.refreshSignals);
  const setReportConfig = usePipelineDebugStore((state) => state.setReportConfig);
  const setAIProvider = usePipelineDebugStore((state) => state.setAIProvider);
  const getActiveEnvironmentVariables = useEnvironmentStore(
    (state) => state.getActiveEnvironmentVariables
  );
  const providers = useSettingsStore((state) => state.providers);
  const activeProvider = useSettingsStore((state) => state.activeAiProvider);
  const saveExecutionArtifact = usePipelineArtifactsStore((state) => state.saveExecutionArtifact);

  const controller = useDebugController();

  const activePipeline = usePipelineStore(
    (state) => state.pipelines.find((p) => p.id === activePipelineId) ?? null
  );
  const lastPersistedIdRef = useRef<string | null>(null);
  const lastAppliedIdRef = useRef<string | null>(null);
  const { handleGenerateReport, handleExportReport } = usePipelineReportActions({
    activePipeline: activePipeline ?? undefined,
    activePipelineId,
    pipelines,
  });

  useEffect(() => {
    const config = providers[activeProvider];
    if (!config?.apiKey || config.apiKey.length < 20) return;
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
      length: activePipeline.narrativeConfig.length ?? "medium",
    });
  }, [activePipeline, setReportConfig]);

  useEffect(() => {
    if (!activePipelineId) return;
    const artifact = usePipelineArtifactsStore.getState().getExecutionArtifact(activePipelineId) as
      | (CheckpointArtifact | null)
      | undefined;

    if (artifact && "isDirty" in artifact && artifact.isDirty) {
      if (lastAppliedIdRef.current === artifact.executionId) return;
      lastAppliedIdRef.current = artifact.executionId;

      const restored = restoreFromCheckpoint(artifact);
      applyControllerSnapshot(restored);
      setHasPersistedExecution(true);
    } else if (artifact) {
      setHasPersistedExecution(true);
    }
  }, [activePipelineId, applyControllerSnapshot, setHasPersistedExecution]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - using snapshots.length to prevent excessive writes during streaming
  useEffect(() => {
    const isInProgress = status === "paused" || status === "running";
    if (!activePipeline || !isInProgress || snapshots.length === 0 || !executionId) {
      return;
    }

    const artifact = buildCheckpointArtifact(
      executionId,
      activePipeline.id,
      snapshots,
      runtimeVariables,
      {
        isDirty: true,
        mode: "full",
        startStepId: null,
        reusedAliases: [],
        staleContextWarning: null,
        completedAt: null,
        currentStepIndex,
        totalSteps,
        errorMessage: null,
        pipeline: activePipeline,
      }
    );
    saveExecutionArtifact(activePipeline.id, artifact);
  }, [
    activePipeline?.id,
    executionId,
    status,
    snapshots.length,
    saveExecutionArtifact,
    runtimeVariables,
    currentStepIndex,
    totalSteps,
    activePipeline,
  ]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - using snapshots.length to prevent excessive writes
  useEffect(() => {
    const isDone = status === "completed" || status === "error" || status === "aborted";
    if (!activePipeline || !isDone || snapshots.length === 0 || !executionId) {
      return;
    }

    const persistenceKey = `${activePipeline.id}:${executionId}`;
    if (lastPersistedIdRef.current === persistenceKey) {
      return;
    }

    const artifact = buildCheckpointArtifact(
      executionId,
      activePipeline.id,
      snapshots,
      runtimeVariables,
      {
        isDirty: false,
        mode: "full",
        startStepId: null,
        reusedAliases: [],
        staleContextWarning: null,
        completedAt,
        currentStepIndex,
        totalSteps,
        errorMessage: errorMessage,
        pipeline: activePipeline,
      }
    );
    saveExecutionArtifact(activePipeline.id, artifact);
    refreshSignals(activePipeline.steps);
    lastPersistedIdRef.current = persistenceKey;
  }, [
    activePipeline?.id,
    executionId,
    status,
    snapshots.length,
    completedAt,
    errorMessage,
    refreshSignals,
    saveExecutionArtifact,
    runtimeVariables,
    currentStepIndex,
    totalSteps,
    activePipeline,
    completedAt,
    errorMessage,
    refreshSignals,
    saveExecutionArtifact,
  ]);

  const handleRun = useCallback(async () => {
    if (!activePipeline) return;
    setExecuting(true);
    setExecutionResult(null);
    setView("stream");
    resetExecution();
    const result = controller.start(activePipeline, getActiveEnvironmentVariables(), {
      executionMode: "auto",
    });
    if (!result.valid) {
      toast.error(`Validation failed: ${result.errors?.join(", ")}`);
      setExecuting(false);
      return;
    }
    toast.success("Pipeline Executed Successfully");
    setExecuting(false);
  }, [
    activePipeline,
    controller,
    resetExecution,
    getActiveEnvironmentVariables,
    setExecuting,
    setExecutionResult,
    setView,
  ]);

  const handleDebug = useCallback(() => {
    if (!activePipeline) return;
    resetExecution();
    setView("stream");
    setExecutionResult(null);
    const result = controller.start(activePipeline, getActiveEnvironmentVariables(), {
      executionMode: "debug",
    });
    if (!result.valid) {
      toast.error(`Validation failed: ${result.errors?.join(", ")}`);
      return;
    }
    toast.info("Debug mode started — use Step or Continue to execute");
  }, [
    activePipeline,
    controller,
    resetExecution,
    getActiveEnvironmentVariables,
    setExecutionResult,
    setView,
  ]);

  const handleRunFromStep = useCallback(
    async (stepId: string, mode: "partial-previous" | "partial-fresh") => {
      if (!activePipeline) return;
      const artifact = usePipelineArtifactsStore
        .getState()
        .getExecutionArtifact(activePipeline.id) as ArtifactInput;
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
      setExecuting(true);
      setExecutionResult(null);
      setView("stream");
      resetExecution();
      const result = controller.start(activePipeline, getActiveEnvironmentVariables(), {
        ...plan.options,
        executionMode: "auto",
      });
      if (!result.valid) {
        toast.error(`Validation failed: ${result.errors?.join(", ")}`);
        setExecuting(false);
        return;
      }
      toast.success("Partial Pipeline Run Completed");
      setExecuting(false);
    },
    [
      activePipeline,
      controller,
      resetExecution,
      getActiveEnvironmentVariables,
      setExecuting,
      setExecutionResult,
      setView,
    ]
  );

  const handleStop = useCallback(() => {
    controller.stop();
    setExecuting(false);
  }, [controller, setExecuting]);

  const handleRetry = useCallback(async () => {
    await controller.retry();
  }, [controller]);

  const handleSkip = useCallback(async () => {
    await controller.skip();
  }, [controller]);

  const handleStep = useCallback(async () => {
    await controller.step();
  }, [controller]);

  const handleResume = useCallback(async () => {
    await controller.resume();
  }, [controller]);

  return {
    handleRun,
    handleDebug,
    handleRunFromStep,
    handleStop,
    handleRetry,
    handleSkip,
    handleStep,
    handleResume,
    controller,
    handleGenerateReport,
    handleExportReport,
  };
}
