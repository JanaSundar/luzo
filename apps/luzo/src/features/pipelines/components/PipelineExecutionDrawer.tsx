"use client";

import { Activity, ChevronDown, Sparkles } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { cn } from "@/utils";
import { DebuggerShell } from "./DebuggerShell";

const STATUS_LABELS: Record<string, string> = {
  aborted: "Aborted",
  completed: "Completed",
  error: "Failed",
  idle: "Idle",
  interrupted: "Interrupted",
  paused: "Paused",
  running: "Running",
};

export function PipelineExecutionDrawer({
  onClose,
  onResizeStart,
  onStep,
  onResume,
  onRetry,
  onStop,
  onRunAuto,
}: {
  onClose: () => void;
  onResizeStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onStep?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
  onStop?: () => void;
  onRunAuto?: () => void;
}) {
  const status = usePipelineExecutionStore((state) => state.status);
  const snapshots = usePipelineExecutionStore((state) => state.snapshots);
  const setView = usePipelineStore((state) => state.setView);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-t-[1.5rem] border border-border/60 border-b-0 bg-background/95 shadow-[0_-24px_48px_-24px_rgba(15,23,42,0.45)] backdrop-blur-md">
      <button
        type="button"
        aria-label="Resize execution timeline drawer"
        onPointerDown={onResizeStart}
        className="mx-auto mb-2 flex h-7 w-20 cursor-ns-resize touch-none items-center justify-center rounded-full"
      >
        <div className="h-1.5 w-14 rounded-full bg-border/90" />
      </button>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="rounded-full bg-primary/10 p-1.5 text-primary">
              <Activity className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">Execution timeline</p>
              <p className="text-xs text-muted-foreground">
                {snapshots.length > 0
                  ? `${snapshots.length} event${snapshots.length === 1 ? "" : "s"} captured`
                  : "Watch runs without leaving the builder"}
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 pl-3">
            {status === "completed" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-primary/20 bg-foreground text-background hover:bg-foreground/90 hover:text-background dark:border-black/10 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:hover:text-black font-bold"
                onClick={() => setView("ai-config")}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Go to configurator</span>
                <span className="sm:hidden">Configurator</span>
              </Button>
            ) : null}
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                status === "running" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
                status === "paused" && "border-amber-500/30 bg-amber-500/10 text-amber-700",
                status === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
                status !== "running" &&
                  status !== "paused" &&
                  status !== "error" &&
                  "border-border bg-muted/50 text-muted-foreground",
              )}
            >
              {STATUS_LABELS[status] ?? "Timeline"}
            </span>
            <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={onClose}>
              <ChevronDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Hide</span>
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
          <DebuggerShell
            onStep={onStep}
            onResume={onResume}
            onRetry={onRetry}
            onStop={onStop}
            onRunAuto={onRunAuto}
          />
        </div>
      </div>
    </section>
  );
}
