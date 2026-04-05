"use client";

import { useMemo } from "react";
import type { CheckpointArtifact } from "@/lib/pipeline/pipeline-persistence";
import { restoreFromCheckpoint } from "@/lib/pipeline/pipeline-persistence";
import { selectTimelineStats } from "@/lib/pipeline/timeline/timeline-selectors";
import { usePipelineArtifactsStore } from "@/lib/stores/usePipelineArtifactsStore";
import { usePipelineExecutionStore } from "@/lib/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { useTimelineStore } from "@/lib/stores/useTimelineStore";
import { DebugControlsBar } from "./DebugControlsBar";
import { TimelineEmpty } from "./debugger/TimelineEmptyState";
import { ResumePrompt } from "./ResumePrompt";
import { TimelinePanel } from "./TimelinePanel";
import { UnresolvedVariablesPanel } from "./UnresolvedVariablesPanel";

// getCookies is no longer needed — the TimelineDetailPane handles response inspection.

interface DebuggerShellProps {
  onStep?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
  onStop?: () => void;
  onRunAuto?: () => void;
}

export function DebuggerShell({
  onStep,
  onResume,
  onRetry,
  onStop,
  onRunAuto,
}: DebuggerShellProps) {
  const status = usePipelineExecutionStore((state) => state.status);
  const snapshots = usePipelineExecutionStore((state) => state.snapshots);
  const currentStepIndex = usePipelineExecutionStore((state) => state.currentStepIndex);
  const totalSteps = usePipelineExecutionStore((state) => state.totalSteps);
  const hasPersistedExecution = usePipelineExecutionStore((state) => state.hasPersistedExecution);
  const activePipelineId = usePipelineStore((state) => state.activePipelineId);

  // Derive stats from timeline store — O(n) single pass, memoized by syncGeneration
  const syncGeneration = useTimelineStore((s) => s.syncGeneration);
  const stats = useMemo(() => {
    const state = useTimelineStore.getState();
    return selectTimelineStats(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncGeneration]);

  const isActive = status === "running" || status === "paused";
  const isDone =
    status === "completed" ||
    status === "error" ||
    status === "aborted" ||
    status === "interrupted";

  if (hasPersistedExecution && activePipelineId && (status === "idle" || snapshots.length === 0)) {
    const artifact = usePipelineArtifactsStore
      .getState()
      .getExecutionArtifact(activePipelineId) as CheckpointArtifact | null;
    if (!artifact) {
      if (status === "idle" && snapshots.length === 0) return <TimelineEmpty />;
    } else if (artifact.isDirty) {
      const snapshot = restoreFromCheckpoint(artifact);
      return (
        <ResumePrompt
          snapshot={snapshot}
          onViewResults={() => {
            usePipelineExecutionStore.getState().applyControllerSnapshot(snapshot);
            usePipelineExecutionStore.getState().setHasPersistedExecution(false);
          }}
          onRerun={() => {
            usePipelineExecutionStore.getState().reset();
            usePipelineExecutionStore.getState().setHasPersistedExecution(false);
          }}
        />
      );
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <DebugControlsBar
        status={status}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        totalTime={stats.totalDurationMs}
        runningCount={stats.running}
        completedCount={stats.completed}
        isActive={isActive}
        isDone={isDone}
        onStep={onStep}
        onResume={onResume}
        onRetry={onRetry}
        onStop={onStop}
        onRunAuto={onRunAuto}
      />

      {status === "paused" && <UnresolvedVariablesPanel />}

      <TimelinePanel />
    </div>
  );
}
