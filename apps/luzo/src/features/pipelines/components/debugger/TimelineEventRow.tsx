"use client";

import { motion } from "motion/react";
import {
  CheckCircle2,
  Circle,
  CircleDot,
  Loader2,
  Pause,
  RotateCcw,
  SkipForward,
  XCircle,
} from "lucide-react";
import { memo } from "react";
import { cn } from "@/utils";
import { METHOD_COLORS } from "@/utils/http";
import type { TimelineEvent } from "@/types/timeline-event";
import { formatBytes, formatDuration } from "@/features/pipeline/timeline/format-utils";
import {
  type StatusIcon,
  getHttpStatusColor,
  getStatusVisual,
} from "@/features/pipeline/timeline/status-config";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { buildPipelineStepNameMap, resolveTimelineDisplayName } from "./timelineDisplayNames";

// ─── Icon resolver ──────────────────────────────────────────────────
const ICON_MAP: Record<StatusIcon, React.ReactNode> = {
  circle: <Circle className="h-3.5 w-3.5" />,
  "circle-dot": <CircleDot className="h-3.5 w-3.5" />,
  "check-circle": <CheckCircle2 className="h-3.5 w-3.5" />,
  "x-circle": <XCircle className="h-3.5 w-3.5" />,
  pause: <Pause className="h-3.5 w-3.5" />,
  "rotate-ccw": <RotateCcw className="h-3.5 w-3.5" />,
  "skip-forward": <SkipForward className="h-3.5 w-3.5" />,
  loader: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
};

// ─── Component ──────────────────────────────────────────────────────
interface TimelineEventRowProps {
  event: TimelineEvent;
  baselineTimestamp: number | null;
  maxDurationMs: number;
  isSelected: boolean;
  isActive: boolean;
  onSelect: (eventId: string) => void;
}

export const TimelineEventRow = memo(function TimelineEventRow({
  event,
  baselineTimestamp,
  maxDurationMs,
  isSelected,
  isActive,
  onSelect,
}: TimelineEventRowProps) {
  const activePipelineId = usePipelineStore((state) => state.activePipelineId);
  const pipeline = usePipelineStore(
    (state) => state.pipelines.find((entry) => entry.id === activePipelineId) ?? null,
  );
  const stepNameById = buildPipelineStepNameMap(pipeline);
  const displayStepName = resolveTimelineDisplayName({
    stepId: event.stepId,
    fallback: event.stepName,
    stepNameById,
  });
  const visual = getStatusVisual(event.status);
  const title =
    event.eventKind === "route_selected"
      ? `${displayStepName} routed ${event.routeSemantics ?? "forward"}`
      : event.eventKind === "step_skipped"
        ? `${displayStepName} skipped`
        : event.eventKind === "poll_attempt"
          ? `${displayStepName} polling attempt ${event.attemptNumber ?? 1}`
          : event.eventKind === "poll_wait"
            ? `${displayStepName} waiting to retry`
            : event.eventKind === "poll_terminal"
              ? `${displayStepName} polling finished`
              : event.eventKind === "webhook_wait"
                ? `${displayStepName} waiting for webhook`
                : event.eventKind === "webhook_matched"
                  ? `${displayStepName} webhook matched`
                  : event.eventKind === "webhook_timeout"
                    ? `${displayStepName} webhook timed out`
                    : displayStepName;
  const relativeStart =
    event.startedAt != null && baselineTimestamp != null
      ? `+${Math.max(0, event.startedAt - baselineTimestamp)}ms`
      : null;
  const durationScale =
    maxDurationMs > 0 && event.durationMs != null ? event.durationMs / maxDurationMs : 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(event.eventId)}
      aria-pressed={isSelected}
      aria-label={`${title} — ${visual.label}`}
      className={cn(
        "w-full text-left p-3 rounded-lg flex flex-col gap-1.5 transition-all border outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring",
        isSelected
          ? "bg-primary/5 border-primary/30 shadow-sm"
          : "bg-transparent border-transparent hover:bg-muted/30",
        isActive && "ring-1 ring-primary/40",
      )}
    >
      {/* Row 1: status + method + name + badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn(visual.color, visual.animated && "animate-pulse")}>
            {ICON_MAP[visual.icon]}
          </span>
          <span
            className={cn(
              "font-mono font-bold text-[10px] shrink-0",
              METHOD_COLORS[event.method] || "text-foreground",
            )}
          >
            {event.method}
          </span>
          <span className="text-xs font-medium truncate text-foreground/80">{title}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {event.eventKind === "route_selected" && event.routeSemantics ? (
            <span className="rounded-md border px-1.5 py-0.5 font-mono text-[9px] border-sky-500/20 bg-sky-500/10 text-sky-700">
              {event.routeSemantics.toUpperCase()}
            </span>
          ) : null}
          {event.eventKind === "step_skipped" ? (
            <span className="rounded-md border px-1.5 py-0.5 font-mono text-[9px] border-muted-foreground/20 bg-muted text-muted-foreground">
              SKIPPED
            </span>
          ) : null}
          {event.eventKind?.startsWith("poll_") ? (
            <span className="rounded-md border px-1.5 py-0.5 font-mono text-[9px] border-amber-500/20 bg-amber-500/10 text-amber-700">
              POLL
            </span>
          ) : null}
          {event.eventKind?.startsWith("webhook_") ? (
            <span className="rounded-md border px-1.5 py-0.5 font-mono text-[9px] border-violet-500/20 bg-violet-500/10 text-violet-700">
              WEBHOOK
            </span>
          ) : null}
          {event.preRequestPassed != null && (
            <span
              className={cn(
                "rounded-md border px-1.5 py-0.5 font-mono text-[9px]",
                event.preRequestPassed
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                  : "border-destructive/20 bg-destructive/10 text-destructive",
              )}
            >
              PRE {event.preRequestPassed ? "OK" : "ERR"}
            </span>
          )}
          {event.postRequestPassed != null && (
            <span
              className={cn(
                "rounded-md border px-1.5 py-0.5 font-mono text-[9px]",
                event.postRequestPassed
                  ? "border-sky-500/20 bg-sky-500/10 text-sky-600"
                  : "border-destructive/20 bg-destructive/10 text-destructive",
              )}
            >
              POST {event.postRequestPassed ? "OK" : "ERR"}
            </span>
          )}
          {event.testsPassed != null && (
            <span
              className={cn(
                "rounded-md border px-1.5 py-0.5 font-mono text-[9px]",
                event.testsPassed
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                  : "border-destructive/20 bg-destructive/10 text-destructive",
              )}
            >
              TEST {event.testsPassed ? "OK" : "ERR"}
            </span>
          )}
          {event.httpStatus != null && (
            <span
              className={cn(
                "font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border",
                event.status === "completed"
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-destructive/10 border-destructive/20",
                getHttpStatusColor(event.httpStatus),
              )}
            >
              {event.httpStatus}
            </span>
          )}
          {event.retryCount > 0 && (
            <span className="font-mono text-[9px] text-amber-500 px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              ×{event.retryCount}
            </span>
          )}
        </div>
      </div>

      {/* Row 2: timing + size + error */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
        {relativeStart && <span>{relativeStart}</span>}
        {event.durationMs != null && <span>{formatDuration(event.durationMs)}</span>}
        {event.responseSize != null && <span>{formatBytes(event.responseSize)}</span>}
        {event.skippedReason ? <span className="truncate">{event.skippedReason}</span> : null}
        {event.summary ? <span className="truncate">{event.summary}</span> : null}
        {event.errorSnapshot && (
          <span className="text-destructive truncate">{event.errorSnapshot.message}</span>
        )}
      </div>

      {event.durationMs != null && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted/50">
          <motion.div
            className={cn(
              "h-full origin-left rounded-full will-change-transform",
              event.status === "failed" ? "bg-destructive/70" : "bg-primary/70",
            )}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: Math.max(durationScale, 0.06) }}
            transition={{ type: "spring", stiffness: 110, damping: 22, mass: 0.55 }}
          />
        </div>
      )}
    </button>
  );
});
