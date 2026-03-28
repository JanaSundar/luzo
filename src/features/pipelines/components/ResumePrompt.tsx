"use client";

import { AlertTriangle, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ControllerSnapshot } from "@/types/pipeline-runtime";

interface ResumePromptProps {
  snapshot: ControllerSnapshot;
  onViewResults: () => void;
  onRerun: () => void;
}

export function ResumePrompt({ snapshot, onViewResults, onRerun }: ResumePromptProps) {
  const totalSteps = snapshot.totalSteps;
  const completedSteps = snapshot.currentStepIndex;
  const startedAt = snapshot.startedAt ? new Date(snapshot.startedAt).toLocaleString() : "Unknown";
  const status = snapshot.state;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
      <div className="rounded-full bg-amber-500/10 p-4">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Previous execution found</h2>
        <p className="text-sm text-muted-foreground">
          A pipeline run from <span className="font-mono text-foreground">{startedAt}</span> was
          interrupted.
        </p>
        <p className="text-xs text-muted-foreground">
          {completedSteps} of {totalSteps} steps completed —{" "}
          <span className="font-medium text-amber-600 capitalize">{status}</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="gap-2" onClick={onViewResults}>
          <Play className="h-3.5 w-3.5" />
          View Results
        </Button>
        <Button variant="default" size="sm" className="gap-2" onClick={onRerun}>
          <RotateCcw className="h-3.5 w-3.5" />
          Re-run Pipeline
        </Button>
      </div>
    </div>
  );
}
