"use client";

import { AlertCircle, CheckCircle2, Circle, Clock, Database, Pause, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { PipelineBadge } from "@/components/pipelines/PipelineBadge";
import { getPipelineExecutionLayout } from "@/lib/pipeline/execution-plan";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { segmentedSurfaceChipClassName } from "@/lib/ui/segmentedTabs";
import { cn } from "@/lib/utils";
import { METHOD_COLORS } from "@/lib/utils/http";
import type { StepSnapshot, StepStatus } from "@/types/pipeline-debug";
import { Badge } from "./StepCard";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  error: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  running: <Circle className="h-3.5 w-3.5 text-primary animate-ping" />,
  pending: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
  aborted: <AlertCircle className="h-3.5 w-3.5 text-amber-500" />,
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}b`;
  return `${(bytes / 1024).toFixed(1)}kb`;
}

interface TimelinePanelProps {
  snapshots: StepSnapshot[];
  selectedIndex: number;
  totalTime: number;
  isPaused: boolean;
  isRunning: boolean;
  currentStepIndex: number;
  totalSteps: number;
  onSelect: (i: number) => void;
}

function getScriptBadge(
  type: "pre_request" | "test",
  result?: {
    status: StepStatus;
    logs: string[];
    error: string | null;
    durationMs: number;
    testResults?: Array<{ name: string; passed: boolean }>;
  },
) {
  if (!result) return null;

  const isPreRequest = type === "pre_request";
  const label = isPreRequest ? "PRE" : "TEST";
  const passed = result.status === "success" && !result.error;
  const hasTests = isPreRequest ? false : result.testResults && result.testResults.length > 0;
  const allPassed =
    hasTests && result.testResults ? result.testResults.every((t) => t.passed) : false;

  return (
    <Badge
      className={cn(
        "font-mono text-[9px] shrink-0 border",
        passed
          ? segmentedSurfaceChipClassName
          : "border-destructive/20 bg-destructive/10 text-destructive",
      )}
    >
      {label} {hasTests ? (allPassed ? "✓" : "✗") : passed ? "✓" : "✗"}
    </Badge>
  );
}

export function TimelinePanel({
  snapshots,
  selectedIndex,
  totalTime,
  isPaused,
  isRunning,
  currentStepIndex,
  totalSteps,
  onSelect,
}: TimelinePanelProps) {
  const pipeline = usePipelineStore((state) =>
    state.activePipelineId
      ? state.pipelines.find((entry) => entry.id === state.activePipelineId)
      : null,
  );
  const layoutByStep = useMemo(
    () => (pipeline ? getPipelineExecutionLayout(pipeline.steps) : new Map()),
    [pipeline],
  );

  return (
    <div className="lg:col-span-3 border-r flex flex-col min-h-0">
      <div className="p-3 border-b bg-muted/10 flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Execution Timeline
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground">{totalTime}ms</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {snapshots.map((snapshot, i) => {
          const layout = layoutByStep.get(snapshot.stepId);
          const previousLayout =
            i > 0 ? layoutByStep.get(snapshots[i - 1]?.stepId ?? "") : undefined;
          const showGroupLabel =
            layout &&
            (i === 0 ||
              previousLayout?.groupLabel !== layout.groupLabel ||
              previousLayout?.parallelGroup !== layout.parallelGroup);

          return (
            <div key={snapshot.stepId} className="space-y-1">
              {showGroupLabel ? (
                <div className="px-1 pt-2">
                  <div className="flex items-center gap-2">
                    <PipelineBadge
                      className={cn(
                        layout.parallelGroup
                          ? "bg-blue-500/12 text-blue-700 dark:text-blue-300"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {layout.groupLabel}
                    </PipelineBadge>
                    <span className="text-[10px] text-muted-foreground">
                      {layout.parallelGroup ? "Independent requests" : "Dependency-ordered"}
                    </span>
                  </div>
                </div>
              ) : null}

              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelect(i)}
                className={cn(
                  "w-full text-left p-3 rounded-lg flex flex-col gap-1.5 transition-all border",
                  layout?.parallelGroup && "border-blue-500/20 bg-blue-500/[0.04]",
                  selectedIndex === i
                    ? "bg-primary/5 border-primary/30 shadow-sm"
                    : "bg-transparent border-transparent hover:bg-muted/30",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {STATUS_ICONS[snapshot.status]}
                    <span
                      className={cn(
                        "font-mono font-bold text-[10px] shrink-0",
                        METHOD_COLORS[snapshot.method] || "text-foreground",
                      )}
                    >
                      {snapshot.method}
                    </span>
                    <span className="text-xs font-medium truncate text-foreground/80">
                      {snapshot.stepName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {layout ? (
                      <PipelineBadge
                        className={cn(
                          layout.mode === "parallel" &&
                            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                          layout.mode === "sequential" &&
                            "bg-blue-500/10 text-blue-700 dark:text-blue-300",
                          layout.mode === "review" &&
                            "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                        )}
                      >
                        {layout.mode}
                      </PipelineBadge>
                    ) : null}
                    {getScriptBadge("pre_request", snapshot.preRequestResult)}
                    {snapshot.reducedResponse && (
                      <Badge
                        className={cn(
                          "font-mono text-[10px] shrink-0 border",
                          snapshot.status === "success"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20",
                        )}
                      >
                        {snapshot.reducedResponse.status}
                      </Badge>
                    )}
                    {getScriptBadge("test", snapshot.testResult)}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">
                  {layout ? <p className="truncate">{layout.detail}</p> : null}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
                  {snapshot.reducedResponse && (
                    <>
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> {snapshot.reducedResponse.latencyMs}ms
                      </span>
                      <span className="flex items-center gap-1">
                        <Database className="h-2.5 w-2.5" />{" "}
                        {formatSize(snapshot.reducedResponse.sizeBytes)}
                      </span>
                    </>
                  )}
                  {snapshot.error && (
                    <span className="text-destructive truncate">{snapshot.error}</span>
                  )}
                </div>
              </motion.button>
            </div>
          );
        })}

        {isPaused && currentStepIndex < totalSteps && (
          <div className="p-3 rounded-lg border bg-amber-500/5 border-amber-500/20 flex items-center gap-3">
            <Pause className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-600">
              Paused — click Step or Continue
            </span>
          </div>
        )}

        {isRunning && (
          <div className="p-3 rounded-lg border bg-muted/20 border-border/50 flex items-center gap-3 animate-pulse">
            <Circle className="h-3.5 w-3.5 text-primary animate-ping" />
            <span className="text-xs font-medium text-muted-foreground">Executing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
