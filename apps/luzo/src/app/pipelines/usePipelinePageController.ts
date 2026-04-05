"use client";

import { useCallback } from "react";
import { getAiProviderEnvKey } from "@/features/flow-editor/domain/ai-step";
import { useDebugController } from "@/lib/pipeline/use-debug-controller";
import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";
import { usePipelineArtifactsStore } from "@/lib/stores/usePipelineArtifactsStore";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { usePipelineExecutionStore } from "@/lib/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import type { AiProvider } from "@/types";
import { usePipelinePageActions } from "./usePipelinePageActions";
import { usePipelinePageLifecycle } from "./usePipelinePageLifecycle";
import { usePipelineReportActions } from "./usePipelineReportActions";

export function usePipelinePageController() {
  const pipelines = usePipelineStore((state) => state.pipelines);
  const activePipelineId = usePipelineStore((state) => state.activePipelineId);
  const activePipeline = usePipelineStore(
    (state) => state.pipelines.find((pipeline) => pipeline.id === state.activePipelineId) ?? null,
  );
  const setExecuting = usePipelineStore((state) => state.setExecuting);
  const setExecutionResult = usePipelineStore((state) => state.setExecutionResult);
  const setView = usePipelineStore((state) => state.setView);

  const snapshots = usePipelineExecutionStore((state) => state.snapshots);
  const status = usePipelineExecutionStore((state) => state.status);
  const runtimeVariables = usePipelineExecutionStore((state) => state.runtimeVariables);
  const originExecutionMode = usePipelineExecutionStore((state) => state.originExecutionMode);
  const executionId = usePipelineExecutionStore((state) => state.executionId);
  const completedAt = usePipelineExecutionStore((state) => state.completedAt);
  const currentStepIndex = usePipelineExecutionStore((state) => state.currentStepIndex);
  const totalSteps = usePipelineExecutionStore((state) => state.totalSteps);
  const errorMessage = usePipelineExecutionStore((state) => state.errorMessage);
  const resetExecution = usePipelineExecutionStore((state) => state.reset);
  const applyControllerSnapshot = usePipelineExecutionStore(
    (state) => state.applyControllerSnapshot,
  );
  const setHasPersistedExecution = usePipelineExecutionStore(
    (state) => state.setHasPersistedExecution,
  );

  const refreshSignals = usePipelineDebugStore((state) => state.refreshSignals);
  const setReportConfig = usePipelineDebugStore((state) => state.setReportConfig);
  const setAIProvider = usePipelineDebugStore((state) => state.setAIProvider);
  const clearReport = usePipelineDebugStore((state) => state.clearReport);
  const clearExecutionContext = usePipelineDebugStore((state) => state.clearExecutionContext);
  const setSelectedSignals = usePipelineDebugStore((state) => state.setSelectedSignals);
  const getActiveEnvironmentVariables = useEnvironmentStore(
    (state) => state.getActiveEnvironmentVariables,
  );
  const providers = useSettingsStore((state) => state.providers);
  const activeProvider = useSettingsStore((state) => state.activeAiProvider);
  const saveExecutionArtifact = usePipelineArtifactsStore((state) => state.saveExecutionArtifact);

  const controller = useDebugController();
  const { handleGenerateReport, handleExportReport } = usePipelineReportActions({
    activePipeline: activePipeline ?? undefined,
    activePipelineId,
    pipelines,
  });

  const getExecutionEnvVariables = useCallback(() => {
    const envVariables = getActiveEnvironmentVariables();
    const aiProviderVariables = Object.fromEntries(
      Object.entries(providers).flatMap(([provider, config]) =>
        config?.apiKey?.trim()
          ? [[getAiProviderEnvKey(provider as AiProvider), config.apiKey.trim()]]
          : [],
      ),
    );

    return {
      ...envVariables,
      ...aiProviderVariables,
    };
  }, [getActiveEnvironmentVariables, providers]);

  usePipelinePageLifecycle({
    activePipeline,
    activePipelineId,
    providers,
    activeProvider,
    snapshots,
    status,
    runtimeVariables,
    originExecutionMode,
    executionId,
    completedAt,
    currentStepIndex,
    totalSteps,
    errorMessage,
    resetExecution,
    applyControllerSnapshot,
    setHasPersistedExecution,
    setExecutionResult,
    clearExecutionContext,
    refreshSignals,
    setReportConfig,
    setAIProvider,
    saveExecutionArtifact,
  });

  const actions = usePipelinePageActions({
    activePipeline,
    activePipelineId,
    controller,
    originExecutionMode,
    activeExecutionId: executionId,
    resetExecution,
    getActiveEnvironmentVariables: getExecutionEnvVariables,
    setExecuting,
    setExecutionResult,
    setView,
    clearReport,
    setSelectedSignals,
  });

  return {
    ...actions,
    controller,
    handleGenerateReport,
    handleExportReport,
  };
}
