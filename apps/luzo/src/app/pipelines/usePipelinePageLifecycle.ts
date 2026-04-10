"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  buildExecutionResultFromArtifact,
  buildRuntimeVariablesFromArtifact,
  buildSnapshotsFromArtifact,
} from "@/features/pipeline/execution-artifacts";
import type { CheckpointArtifact } from "@/features/pipeline/pipeline-persistence";
import { restoreFromCheckpoint } from "@/features/pipeline/pipeline-persistence";
import { usePipelineArtifactsStore } from "@/stores/usePipelineArtifactsStore";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import type { Pipeline } from "@/types";
import type { PersistedExecutionArtifact } from "@/types/pipeline-debug";
import type { AIProviderConfig, AIReportConfig } from "@/types/pipeline-report";
import { usePipelineCheckpointPersistence } from "./usePipelineCheckpointPersistence";
import type { AiProvider, PipelineExecutionResult } from "@/types";

interface LifecycleArgs {
  activePipeline: Pipeline | null;
  activePipelineId: string | null;
  providers: Record<string, { apiKey?: string; model?: string } | undefined>;
  activeProvider: string;
  snapshots: ReturnType<typeof usePipelineExecutionStore.getState>["snapshots"];
  status: ReturnType<typeof usePipelineExecutionStore.getState>["status"];
  runtimeVariables: Record<string, unknown>;
  originExecutionMode: ReturnType<typeof usePipelineExecutionStore.getState>["originExecutionMode"];
  executionId: string | null;
  completedAt: number | null;
  currentStepIndex: number;
  totalSteps: number;
  errorMessage: string | null;
  resetExecution: () => void;
  applyControllerSnapshot: ReturnType<
    typeof usePipelineExecutionStore.getState
  >["applyControllerSnapshot"];
  setHasPersistedExecution: (has: boolean) => void;
  setExecutionResult: (result: PipelineExecutionResult | null) => void;
  clearExecutionContext: () => void;
  refreshSignals: (steps: Pipeline["steps"]) => void;
  setReportConfig: (value: Partial<AIReportConfig>) => void;
  setAIProvider: (value: Partial<AIProviderConfig>) => void;
  saveExecutionArtifact: (pipelineId: string, artifact: CheckpointArtifact) => void;
}

export function usePipelinePageLifecycle(args: LifecycleArgs) {
  const {
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
  } = args;

  const lastPersistedIdRef = useRef<string | null>(null);
  const lastAppliedIdRef = useRef<string | null>(null);
  const lastStatusRef = useRef(status);

  useEffect(() => {
    const config = providers[activeProvider];
    const apiKey = config?.apiKey?.trim();
    if (!apiKey) return;
    setAIProvider({
      provider: activeProvider as AiProvider,
      model: config?.model ?? "",
      apiKey,
    });
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
    resetExecution();
    setExecutionResult(null);
    clearExecutionContext();
    lastAppliedIdRef.current = null;

    if (!activePipelineId || !activePipeline) {
      setHasPersistedExecution(false);
      return;
    }

    const artifact = usePipelineArtifactsStore.getState().getExecutionArtifact(activePipelineId) as
      | CheckpointArtifact
      | PersistedExecutionArtifact
      | null
      | undefined;

    if (artifact && "isDirty" in artifact) {
      if (lastAppliedIdRef.current === artifact.executionId) return;
      lastAppliedIdRef.current = artifact.executionId;
      applyControllerSnapshot(restoreFromCheckpoint(artifact));
      setHasPersistedExecution(true);
      refreshSignals(activePipeline.steps);
      return;
    }

    if (!artifact) {
      setHasPersistedExecution(false);
      return;
    }

    hydratePersistedArtifact(
      artifact,
      setExecutionResult,
      refreshSignals,
      setHasPersistedExecution,
      activePipeline,
    );
  }, [
    activePipeline,
    activePipelineId,
    applyControllerSnapshot,
    clearExecutionContext,
    refreshSignals,
    resetExecution,
    setExecutionResult,
    setHasPersistedExecution,
  ]);

  usePipelineCheckpointPersistence({
    activePipeline,
    snapshots,
    status,
    originExecutionMode,
    runtimeVariables,
    executionId,
    completedAt,
    currentStepIndex,
    totalSteps,
    errorMessage,
    refreshSignals,
    saveExecutionArtifact,
    lastPersistedIdRef,
  });

  useEffect(() => {
    const wasRunning = lastStatusRef.current === "running";
    const isDone = status === "completed" || status === "error";
    if (!wasRunning || !isDone) {
      lastStatusRef.current = status;
      return;
    }

    const successCount = snapshots.filter(
      (s) => s.status === "success" || s.status === "done",
    ).length;
    const failCount = snapshots.filter((s) => s.status === "error").length;
    if (status === "error") {
      // Unrecoverable runtime error (not a step failure — those continue along failure routes)
      toast.error(`Pipeline encountered an unexpected error`);
    } else if (failCount === 0) {
      toast.success(
        `Pipeline Completed: ${successCount} step${successCount !== 1 ? "s" : ""} succeeded`,
      );
    } else {
      toast.warning(`Pipeline Completed: ${successCount} succeeded, ${failCount} failed`);
    }
    lastStatusRef.current = status;
  }, [status, snapshots]);
}

function hydratePersistedArtifact(
  artifact: PersistedExecutionArtifact,
  setExecutionResult: (result: PipelineExecutionResult | null) => void,
  refreshSignals: (steps: Pipeline["steps"]) => void,
  setHasPersistedExecution: (has: boolean) => void,
  activePipeline: Pipeline,
) {
  const snapshots = buildSnapshotsFromArtifact(artifact);
  const runtime = buildRuntimeVariablesFromArtifact(artifact);
  const result = buildExecutionResultFromArtifact(artifact);
  usePipelineExecutionStore.setState({
    executionId: null,
    status: result?.status === "failed" ? "error" : "completed",
    originExecutionMode: "auto",
    currentStepIndex: snapshots.length > 0 ? snapshots.length - 1 : -1,
    totalSteps: snapshots.length,
    snapshots,
    runtimeVariables: runtime,
    variableOverrides: {},
    errorMessage: result?.error ?? null,
    startedAt: new Date(artifact.generatedAt).getTime(),
    completedAt: artifact.runtime.completedAt
      ? new Date(artifact.runtime.completedAt).getTime()
      : null,
    hasPersistedExecution: true,
  });
  setExecutionResult(result);
  refreshSignals(activePipeline.steps);
  setHasPersistedExecution(true);
}
