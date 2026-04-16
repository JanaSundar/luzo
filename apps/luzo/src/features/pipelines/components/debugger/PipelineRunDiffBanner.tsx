"use client";

import { AlertTriangle, GitCompareArrows, Pin, RotateCcw, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { buildPipelineRunDiff } from "@/features/pipeline/run-diff";
import { usePipelineArtifactsStore } from "@/stores/usePipelineArtifactsStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

export function PipelineRunDiffBanner({
  status,
}: {
  status: "idle" | "running" | "paused" | "error" | "completed" | "aborted" | "interrupted";
}) {
  const activePipelineId = usePipelineStore((state) => state.activePipelineId);
  const currentArtifact = usePipelineArtifactsStore((state) =>
    activePipelineId ? state.getExecutionArtifact(activePipelineId) : null,
  );
  const baseline = usePipelineArtifactsStore((state) =>
    activePipelineId ? state.getBaselineArtifact(activePipelineId) : null,
  );
  const saveBaselineArtifact = usePipelineArtifactsStore((state) => state.saveBaselineArtifact);
  const clearBaselineArtifact = usePipelineArtifactsStore((state) => state.clearBaselineArtifact);

  const diff = useMemo(() => {
    if (!currentArtifact || !baseline) return null;
    return buildPipelineRunDiff(currentArtifact, baseline);
  }, [baseline, currentArtifact]);

  if (!activePipelineId || !currentArtifact) return null;

  const isDone =
    status === "completed" ||
    status === "error" ||
    status === "aborted" ||
    status === "interrupted";
  const canPinBaseline = isDone && currentArtifact.steps.length > 0;

  const handlePinBaseline = () => {
    saveBaselineArtifact(activePipelineId, {
      artifact: currentArtifact,
      note: null,
      pinnedAt: new Date().toISOString(),
      sourceGeneratedAt: currentArtifact.generatedAt,
    });
    toast.success("Pinned the current execution as the baseline");
  };

  const handleClearBaseline = () => {
    clearBaselineArtifact(activePipelineId);
    toast.success("Cleared the pinned baseline");
  };

  return (
    <section className="rounded-xl border border-border/50 bg-muted/10 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border/50 bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Run Diff
            </span>
            {baseline ? (
              <span className="text-xs text-muted-foreground">
                Baseline pinned {new Date(baseline.pinnedAt).toLocaleString()}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Pin a known-good execution to start tracking regressions.
              </span>
            )}
          </div>
          {baseline && diff && isDone ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <SeverityChip
                label={`${diff.summary.regressions} regression${diff.summary.regressions === 1 ? "" : "s"}`}
                tone={diff.summary.regressions > 0 ? "regression" : "neutral"}
              />
              <SeverityChip
                label={`${diff.summary.changedSteps} changed`}
                tone={diff.summary.changedSteps > 0 ? "changed" : "neutral"}
              />
              <SeverityChip
                label={`${diff.summary.improvements} improved`}
                tone={diff.summary.improvements > 0 ? "improved" : "neutral"}
              />
            </div>
          ) : null}
          {baseline && diff?.summary.warnings.length ? (
            <div className="space-y-1 pt-1">
              {diff.summary.warnings.map((warning) => (
                <div
                  key={warning}
                  className="flex items-start gap-2 rounded-lg border border-amber-300/40 bg-amber-50/80 px-2.5 py-2 text-xs text-amber-900"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-2"
            disabled={!canPinBaseline}
            onClick={handlePinBaseline}
          >
            {baseline ? <RotateCcw className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            {baseline ? "Replace baseline" : "Pin current run"}
          </Button>
          {baseline ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-2"
              onClick={handleClearBaseline}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear baseline
            </Button>
          ) : null}
        </div>
      </div>

      {baseline && diff && isDone ? (
        <div className="mt-3 rounded-lg border border-border/50 bg-background/80 px-3 py-2.5 text-sm">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <GitCompareArrows className="h-4 w-4 text-primary" />
            {buildSummaryLine(diff.summary)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Use the new timeline filters or open a request event to inspect step-level differences.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function buildSummaryLine(summary: ReturnType<typeof buildPipelineRunDiff>["summary"]) {
  if (summary.regressions > 0) {
    return `${summary.regressions} regression${summary.regressions === 1 ? "" : "s"} detected against the pinned baseline.`;
  }
  if (summary.changedSteps === 0) {
    return "Latest run matches the pinned baseline.";
  }
  if (summary.improvements > 0 && summary.changedSteps === summary.improvements) {
    return `Latest run improved on ${summary.improvements} step${summary.improvements === 1 ? "" : "s"}.`;
  }
  return `${summary.changedSteps} step${summary.changedSteps === 1 ? "" : "s"} changed relative to the pinned baseline.`;
}

function SeverityChip({
  label,
  tone,
}: {
  label: string;
  tone: "regression" | "changed" | "improved" | "neutral";
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tone === "regression" && "border-destructive/30 bg-destructive/10 text-destructive",
        tone === "changed" && "border-amber-400/40 bg-amber-100/70 text-amber-900",
        tone === "improved" && "border-emerald-400/40 bg-emerald-100/70 text-emerald-900",
        tone === "neutral" && "border-border/50 bg-background text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
