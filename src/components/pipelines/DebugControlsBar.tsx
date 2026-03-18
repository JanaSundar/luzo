"use client";

import { Play, SkipForward, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DebugRuntimeState } from "@/types/pipeline-debug";

interface DebugControlsBarProps {
  runtime: DebugRuntimeState;
  totalTime: number;
  isActive: boolean;
  isDone: boolean;
  onStep: () => void;
  onContinue: () => void;
  onStop: () => void;
}

export function DebugControlsBar({
  runtime,
  totalTime,
  isActive,
  isDone,
  onStep,
  onContinue,
  onStop,
}: DebugControlsBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-background border rounded-xl shadow-sm">
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            runtime.status === "running"
              ? "bg-primary animate-pulse"
              : runtime.status === "paused"
                ? "bg-amber-500"
                : runtime.status === "completed"
                  ? "bg-emerald-500"
                  : runtime.status === "failed"
                    ? "bg-destructive"
                    : "bg-muted-foreground"
          )}
        />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {runtime.status}
        </span>
      </div>

      <div className="h-4 w-px bg-border" />

      <span className="text-xs font-mono text-muted-foreground">
        Step {Math.min(runtime.currentStepIndex + 1, runtime.totalSteps)}/{runtime.totalSteps}
      </span>

      <div className="flex-1" />

      {isActive && (
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 h-7 text-[10px] font-bold"
            onClick={onStep}
            disabled={runtime.status === "running"}
          >
            <SkipForward className="h-3 w-3" />
            Step
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 h-7 text-[10px] font-bold"
            onClick={onContinue}
            disabled={runtime.status === "running"}
          >
            <Play className="h-3 w-3 fill-current" />
            Continue
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="gap-1.5 h-7 text-[10px] font-bold"
            onClick={onStop}
          >
            <Square className="h-3 w-3 fill-current" />
            Stop
          </Button>
        </div>
      )}

      {isDone && (
        <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
          Total: {totalTime}ms
        </span>
      )}
    </div>
  );
}
