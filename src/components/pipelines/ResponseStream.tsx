"use client";

import { Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import type { StepSnapshot } from "@/types/pipeline-debug";
import { DebugControlsBar } from "./DebugControlsBar";
import { MiddlePanel } from "./MiddlePanel";
import { ResponseBodyPanel } from "./ResponseBodyPanel";
import { TimelinePanel } from "./TimelinePanel";

export function ResponseStream() {
  const { runtime, snapshots, stepNext, continueAll, stopExecution } = usePipelineDebugStore();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedSnapshot = snapshots[selectedIndex] as StepSnapshot | undefined;

  const totalTime = useMemo(
    () =>
      snapshots
        .map((s) => s.reducedResponse?.latencyMs ?? 0)
        .filter((l) => l > 0)
        .reduce((a, b) => a + b, 0),
    [snapshots]
  );

  const parsedBody = useMemo(() => {
    if (!selectedSnapshot?.reducedResponse?.summary) return null;
    try {
      return JSON.stringify(selectedSnapshot.reducedResponse.summary, null, 2);
    } catch {
      return null;
    }
  }, [selectedSnapshot]);

  const cookies = useMemo(() => {
    if (!selectedSnapshot?.reducedResponse?.headers) return [];
    const entry = Object.entries(selectedSnapshot.reducedResponse.headers).find(
      ([k]) => k.toLowerCase() === "set-cookie"
    );
    return (
      entry?.[1]
        ?.split(",")
        .map((c) => c.trim())
        .filter(Boolean) ?? []
    );
  }, [selectedSnapshot]);

  const isActive = runtime.status === "running" || runtime.status === "paused";
  const isDone =
    runtime.status === "completed" || runtime.status === "failed" || runtime.status === "aborted";

  if (runtime.status === "idle" && snapshots.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
        <div className="p-4 rounded-full bg-muted/30">
          <Clock className="h-8 w-8 opacity-20" />
        </div>
        <p className="text-sm">Run a pipeline to see real-time results</p>
        <p className="text-xs text-muted-foreground">Use Debug mode for step-by-step execution</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
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

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-0 border rounded-xl bg-background overflow-hidden shadow-sm">
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
        <MiddlePanel snapshot={selectedSnapshot} cookies={cookies} />
        <ResponseBodyPanel
          parsedBody={parsedBody}
          hasSnapshots={snapshots.length > 0}
          snapshot={selectedSnapshot}
        />
      </div>
    </div>
  );
}
