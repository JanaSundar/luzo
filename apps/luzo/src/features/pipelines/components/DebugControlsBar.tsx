"use client";
import { Play, RotateCcw, Square, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

interface DebugControlsBarProps {
  status: string;
  currentStepIndex: number;
  totalSteps: number;
  totalTime: number;
  runningCount: number;
  completedCount: number;
  isDone: boolean;
  isDebug?: boolean;
  onStep?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
  onStop?: () => void;
  onRunAuto?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-muted-foreground",
  running: "bg-primary animate-pulse",
  paused: "bg-amber-500",
  completed: "bg-emerald-500",
  error: "bg-destructive",
  aborted: "bg-amber-500",
  interrupted: "bg-amber-500",
};

export function DebugControlsBar({
  status,
  currentStepIndex,
  totalSteps,
  totalTime,
  runningCount,
  completedCount,
  isDone,
  isDebug = true,
  onStep,
  onResume,
  onRetry,
  onStop,
  onRunAuto,
}: DebugControlsBarProps) {
  const progressLabel =
    runningCount > 1
      ? `${runningCount} running in parallel • ${completedCount}/${totalSteps} done`
      : `Step ${Math.min(currentStepIndex + 1, totalSteps)}/${totalSteps}`;
  const showDebugCluster = isDebug && (status === "paused" || status === "running");
  const controlsDisabled = status === "running";

  return (
    <div className="rounded-xl border bg-background px-4 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div
            className={cn("h-2 w-2 rounded-full", STATUS_COLORS[status] ?? "bg-muted-foreground")}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {status}
          </span>
        </div>

        <div className="h-4 w-px bg-border" />

        <span className="text-xs font-mono text-muted-foreground">{progressLabel}</span>

        <div className="flex-1" />

        {status === "idle" && (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 h-7 text-[10px] font-bold"
              onClick={onRunAuto}
            >
              <Zap className="h-3 w-3" />
              Run
            </Button>
          </div>
        )}

        {showDebugCluster && (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 h-7 text-[10px] font-bold"
              onClick={onStep}
              disabled={controlsDisabled}
            >
              <Play className="h-3 w-3 fill-current" />
              Step
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 h-7 text-[10px] font-bold"
              onClick={onResume}
              disabled={controlsDisabled}
            >
              <Play className="h-3 w-3 fill-current" />
              Continue
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 h-7 text-[10px] font-bold"
              onClick={onRetry}
              disabled={controlsDisabled}
            >
              <RotateCcw className="h-3 w-3" />
              Retry
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

        {isDebug && status === "error" && (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 h-7 text-[10px] font-bold"
              onClick={onRetry}
            >
              <RotateCcw className="h-3 w-3" />
              Retry
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
          <span className="rounded bg-muted/30 px-2 py-0.5 text-xs font-mono text-muted-foreground">
            Total: {totalTime}ms
          </span>
        )}
      </div>
    </div>
  );
}
