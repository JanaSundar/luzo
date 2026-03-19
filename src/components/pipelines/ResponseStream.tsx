"use client";

import { Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePipelineArtifactsStore } from "@/lib/stores/usePipelineArtifactsStore";
import { usePipelineRuntimeStore } from "@/lib/stores/usePipelineRuntimeStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import type { StepSnapshot } from "@/types/pipeline-debug";
import { DebugControlsBar } from "./DebugControlsBar";
import { MiddlePanel } from "./MiddlePanel";
import { ResponseBodyPanel } from "./ResponseBodyPanel";
import {
  PreRequestOutputPanel,
  type ResponsePanelTab,
  ResponseTabBar,
  TestOutputPanel,
} from "./ResponseDetailPanels";
import { TimelinePanel } from "./TimelinePanel";
import { UnresolvedVariablesPanel } from "./UnresolvedVariablesPanel";

export function ResponseStream() {
  const runtime = usePipelineRuntimeStore((state) => state.runtime);
  const snapshots = usePipelineRuntimeStore((state) => state.snapshots);
  const stepNext = usePipelineRuntimeStore((state) => state.stepNext);
  const continueAll = usePipelineRuntimeStore((state) => state.continueAll);
  const stopExecution = usePipelineRuntimeStore((state) => state.stopExecution);
  const activePipelineId = usePipelineStore((state) => state.activePipelineId);
  const savedDebugger = usePipelineArtifactsStore((state) =>
    activePipelineId ? (state.debuggerByPipelineId[activePipelineId] ?? null) : null
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
    [snapshots]
  );
  const parsedBody = useMemo(() => toDisplayBody(selectedSnapshot), [selectedSnapshot]);
  const cookies = useMemo(() => getCookies(selectedSnapshot), [selectedSnapshot]);

  const isActive = runtime.status === "running" || runtime.status === "paused";
  const isDone =
    runtime.status === "completed" || runtime.status === "failed" || runtime.status === "aborted";

  if (runtime.status === "idle" && snapshots.length === 0) {
    return <EmptyStreamState />;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {(isActive || isDone) && (
        <DebugControlsBar
          runtime={runtime}
          totalTime={totalTime}
          isActive={isActive}
          isDone={isDone}
          onStep={stepNext}
          onContinue={continueAll}
          onStop={stopExecution}
        />
      )}

      {runtime.status === "paused" && <UnresolvedVariablesPanel />}

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-xl border bg-background shadow-sm lg:grid-cols-12">
        <TimelinePanel
          snapshots={snapshots}
          selectedIndex={selectedIndex}
          totalTime={totalTime}
          isPaused={runtime.status === "paused"}
          isRunning={runtime.status === "running"}
          currentStepIndex={runtime.currentStepIndex}
          totalSteps={runtime.totalSteps}
          onSelect={setSelectedIndex}
        />
        <div className="flex min-h-0 flex-1 flex-col border-t lg:col-span-9 lg:border-t-0 lg:border-l">
          <ResponseTabBar panelTab={panelTab} onTabChange={setPanelTab} />
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
            {panelTab === "response" ? (
              <>
                <MiddlePanel snapshot={selectedSnapshot} cookies={cookies} />
                <ResponseBodyPanel
                  parsedBody={parsedBody}
                  hasSnapshots={snapshots.length > 0}
                  snapshot={selectedSnapshot}
                  isFullResponse={Boolean(selectedSnapshot?.fullBody)}
                />
              </>
            ) : null}
            {panelTab === "pre-request" ? (
              <PreRequestOutputPanel snapshot={selectedSnapshot} />
            ) : null}
            {panelTab === "tests" ? <TestOutputPanel snapshot={selectedSnapshot} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

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

function toDisplayBody(snapshot?: StepSnapshot) {
  if (snapshot?.fullBody) {
    try {
      return JSON.stringify(JSON.parse(snapshot.fullBody), null, 2);
    } catch {
      return snapshot.fullBody;
    }
  }

  if (!snapshot?.reducedResponse?.summary) {
    return null;
  }

  try {
    return JSON.stringify(snapshot.reducedResponse.summary, null, 2);
  } catch {
    return null;
  }
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
