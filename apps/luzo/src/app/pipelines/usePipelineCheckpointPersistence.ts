"use client";

import type { MutableRefObject } from "react";
import { useEffect } from "react";
import { buildCheckpointArtifact } from "@/lib/pipeline/pipeline-persistence";
import type { CheckpointArtifact } from "@/lib/pipeline/pipeline-persistence";
import type { Pipeline } from "@/types";
import { usePipelineExecutionStore } from "@/lib/stores/usePipelineExecutionStore";

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
        mode: "full",
        originExecutionMode,
        startStepId: null,
        reusedAliases: [],
        staleContextWarning: null,
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
    originExecutionMode,
    runtimeVariables,
    saveExecutionArtifact,
    snapshots,
    snapshotsLength,
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
        mode: "full",
        originExecutionMode,
        startStepId: null,
        reusedAliases: [],
        staleContextWarning: null,
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
    originExecutionMode,
    refreshSignals,
    runtimeVariables,
    saveExecutionArtifact,
    snapshots,
    snapshotsLength,
    totalSteps,
    lastPersistedIdRef,
  ]);
}
