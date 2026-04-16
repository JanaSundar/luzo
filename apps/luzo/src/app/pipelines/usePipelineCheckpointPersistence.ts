"use client";

import type { MutableRefObject } from "react";
import { useEffect } from "react";
import { buildCheckpointArtifact } from "@/features/pipeline/pipeline-persistence";
import type { CheckpointArtifact } from "@/features/pipeline/pipeline-persistence";
import type { Pipeline } from "@/types";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";

interface CheckpointArgs {
  activePipeline: Pipeline | null;
  snapshots: ReturnType<typeof usePipelineExecutionStore.getState>["snapshots"];
  status: ReturnType<typeof usePipelineExecutionStore.getState>["status"];
  originExecutionMode: ReturnType<typeof usePipelineExecutionStore.getState>["originExecutionMode"];
  runtimeVariables: Record<string, unknown>;
  executionId: string | null;
  completedAt: number | null;
  currentStepIndex: number;
  totalSteps: number;
  errorMessage: string | null;
  partialMode: ReturnType<typeof usePipelineExecutionStore.getState>["partialMode"];
  startStepId: string | null;
  reusedAliases: string[];
  staleContextWarning: string | null;
  refreshSignals: (steps: Pipeline["steps"]) => void;
  saveExecutionArtifact: (pipelineId: string, artifact: CheckpointArtifact) => void;
  lastPersistedIdRef: MutableRefObject<string | null>;
}

export function usePipelineCheckpointPersistence({
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
  partialMode,
  startStepId,
  reusedAliases,
  staleContextWarning,
  refreshSignals,
  saveExecutionArtifact,
  lastPersistedIdRef,
}: CheckpointArgs) {
  const snapshotsLength = snapshots.length;
  const inProgress = status === "paused" || status === "running";
  const done = status === "completed" || status === "error" || status === "aborted";

  useEffect(() => {
    if (!activePipeline || !inProgress || snapshotsLength === 0 || !executionId) return;
    saveExecutionArtifact(
      activePipeline.id,
      buildCheckpointArtifact(executionId, activePipeline.id, snapshots, runtimeVariables, {
        isDirty: true,
        mode: partialMode,
        originExecutionMode,
        startStepId,
        reusedAliases,
        staleContextWarning,
        completedAt: null,
        currentStepIndex,
        totalSteps,
        errorMessage: null,
        pipeline: activePipeline,
      }),
    );
  }, [
    activePipeline,
    currentStepIndex,
    executionId,
    inProgress,
    partialMode,
    originExecutionMode,
    runtimeVariables,
    saveExecutionArtifact,
    snapshots,
    snapshotsLength,
    startStepId,
    reusedAliases,
    staleContextWarning,
    totalSteps,
  ]);

  useEffect(() => {
    if (!activePipeline || !done || snapshotsLength === 0 || !executionId) return;
    const persistenceKey = `${activePipeline.id}:${executionId}`;
    if (lastPersistedIdRef.current === persistenceKey) return;

    saveExecutionArtifact(
      activePipeline.id,
      buildCheckpointArtifact(executionId, activePipeline.id, snapshots, runtimeVariables, {
        isDirty: false,
        mode: partialMode,
        originExecutionMode,
        startStepId,
        reusedAliases,
        staleContextWarning,
        completedAt,
        currentStepIndex,
        totalSteps,
        errorMessage,
        pipeline: activePipeline,
      }),
    );
    refreshSignals(activePipeline.steps);
    lastPersistedIdRef.current = persistenceKey;
  }, [
    activePipeline,
    completedAt,
    currentStepIndex,
    done,
    errorMessage,
    executionId,
    partialMode,
    originExecutionMode,
    refreshSignals,
    reusedAliases,
    runtimeVariables,
    saveExecutionArtifact,
    snapshots,
    snapshotsLength,
    staleContextWarning,
    startStepId,
    totalSteps,
    lastPersistedIdRef,
  ]);
}
