"use client";

import { Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CheckpointArtifact } from "@/lib/pipeline/pipeline-persistence";
import { restoreFromCheckpoint } from "@/lib/pipeline/pipeline-persistence";
import { usePipelineArtifactsStore } from "@/lib/stores/usePipelineArtifactsStore";
import { usePipelineExecutionStore } from "@/lib/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import type { StepSnapshot } from "@/types/pipeline-debug";
import { DebugControlsBar } from "./DebugControlsBar";
import { type RedactionMode, ResponseBodyView } from "./ResponseBodyView";
import {
  PreRequestOutputPanel,
  type ResponsePanelTab,
  ResponseTabBar,
  TestOutputPanel,
} from "./ResponseDetailPanels";
import { ResumePrompt } from "./ResumePrompt";
import { StepStatusPanel } from "./StepStatusPanel";
import { TimelinePanel } from "./TimelinePanel";
import { UnresolvedVariablesPanel } from "./UnresolvedVariablesPanel";

function EmptyStreamState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <div className="rounded-full bg-muted/30 p-4">
        <Clock className="h-8 w-8 opacity-20" />
      </div>
      <p className="text-sm">Run a pipeline to see real-time results</p>
      <p className="text-xs text-muted-foreground">Use Debug mode for step-by-step execution</p>
    </div>
  );
}

function getCookies(snapshot?: StepSnapshot) {
  const headers = snapshot?.fullHeaders ?? snapshot?.reducedResponse?.headers;
  if (!headers) return [];
  const cookieHeader = Object.entries(headers).find(([key]) => key.toLowerCase() === "set-cookie");
  return (
    cookieHeader?.[1]
      ?.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean) ?? []
  );
}

interface DebuggerShellProps {
  redactionMode?: RedactionMode;
  onStep?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
  onSkip?: () => void;
  onStop?: () => void;
  onRunAuto?: () => void;
}

export function DebuggerShell({
  redactionMode = "full",
  onStep,
  onResume,
  onRetry,
  onSkip,
  onStop,
  onRunAuto,
}: DebuggerShellProps) {
  const status = usePipelineExecutionStore((state) => state.status);
  const snapshots = usePipelineExecutionStore((state) => state.snapshots);
  const currentStepIndex = usePipelineExecutionStore((state) => state.currentStepIndex);
  const totalSteps = usePipelineExecutionStore((state) => state.totalSteps);
  const hasPersistedExecution = usePipelineExecutionStore((state) => state.hasPersistedExecution);
  const activePipelineId = usePipelineStore((state) => state.activePipelineId);
  const savedDebugger = usePipelineArtifactsStore((state) =>
    activePipelineId ? (state.debuggerByPipelineId[activePipelineId] ?? null) : null,
  );
  const saveDebuggerArtifact = usePipelineArtifactsStore((state) => state.saveDebuggerArtifact);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [panelTab, setPanelTab] = useState<ResponsePanelTab>("response");

  useEffect(() => {
    if (!savedDebugger) return;
    setSelectedIndex(savedDebugger.selectedStepIndex);
    setPanelTab(savedDebugger.panelTab);
  }, [savedDebugger]);

  useEffect(() => {
    if (!activePipelineId) return;
    saveDebuggerArtifact(activePipelineId, {
      pipelineId: activePipelineId,
      selectedStepIndex: selectedIndex,
      panelTab,
    });
  }, [activePipelineId, panelTab, saveDebuggerArtifact, selectedIndex]);

  useEffect(() => {
    if (selectedIndex < snapshots.length) return;
    setSelectedIndex(Math.max(0, snapshots.length - 1));
  }, [selectedIndex, snapshots.length]);

  const selectedSnapshot = snapshots[selectedIndex] as StepSnapshot | undefined;
  const totalTime = useMemo(
    () =>
      snapshots
        .map((snapshot) => snapshot.reducedResponse?.latencyMs ?? 0)
        .filter((latency) => latency > 0)
        .reduce((sum, latency) => sum + latency, 0),
    [snapshots],
  );
  const cookies = useMemo(() => getCookies(selectedSnapshot), [selectedSnapshot]);

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
      if (status === "idle" && snapshots.length === 0) return <EmptyStreamState />;
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
        totalTime={totalTime}
        isActive={isActive}
        isDone={isDone}
        onStep={onStep}
        onResume={onResume}
        onRetry={onRetry}
        onSkip={onSkip}
        onStop={onStop}
        onRunAuto={onRunAuto}
      />

      {status === "paused" && <UnresolvedVariablesPanel />}

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-xl border bg-background shadow-sm lg:grid-cols-12">
        <TimelinePanel
          snapshots={snapshots}
          selectedIndex={selectedIndex}
          totalTime={totalTime}
          isPaused={status === "paused"}
          isRunning={status === "running"}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          onSelect={setSelectedIndex}
        />

        <div className="flex min-h-0 flex-1 flex-col border-t lg:col-span-9 lg:border-t-0 lg:border-l">
          <ResponseTabBar panelTab={panelTab} onTabChange={setPanelTab} />
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden sm:grid-cols-10">
            {panelTab === "response" ? (
              <>
                <StepStatusPanel
                  snapshot={selectedSnapshot}
                  executionStatus={status}
                  cookies={cookies}
                />
                <ResponseBodyView
                  snapshot={selectedSnapshot}
                  hasSnapshots={snapshots.length > 0}
                  redactionMode={redactionMode}
                />
              </>
            ) : null}
            {panelTab === "pre-request" ? (
              <div className="col-span-10">
                <PreRequestOutputPanel snapshot={selectedSnapshot} />
              </div>
            ) : null}
            {panelTab === "tests" ? (
              <div className="col-span-10">
                <TestOutputPanel snapshot={selectedSnapshot} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
