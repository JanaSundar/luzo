"use client";

import { motion } from "motion/react";
import {
  CheckCircle2,
  Circle,
  CircleDot,
  GitBranch,
  Loader2,
  Pause,
  RotateCcw,
  SkipForward,
  XCircle,
} from "lucide-react";
import { memo } from "react";
import { useTimelineStore } from "@/lib/stores/useTimelineStore";
import { cn } from "@/lib/utils";
import { METHOD_COLORS } from "@/lib/utils/http";
import {
  isConditionTimelineEvent,
  isRequestTimelineEvent,
  type TimelineEvent,
} from "@/types/timeline-event";
import { formatBytes, formatDuration } from "@/lib/pipeline/timeline/format-utils";
import {
  type StatusIcon,
  getHttpStatusColor,
  getStatusVisual,
} from "@/lib/pipeline/timeline/status-config";

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
  isDimmed: boolean;
  onSelect: (eventId: string) => void;
}

export const TimelineEventRow = memo(function TimelineEventRow({
  event,
  baselineTimestamp,
  maxDurationMs,
  isSelected,
  isActive,
  isDimmed,
  onSelect,
}: TimelineEventRowProps) {
  const focusRoute = useTimelineStore((state) => state.focusRoute);
  const visual = getStatusVisual(event.status);
  const relativeStart =
    event.startedAt != null && baselineTimestamp != null
      ? `+${Math.max(0, event.startedAt - baselineTimestamp)}ms`
      : null;
  const durationScale =
    maxDurationMs > 0 && event.durationMs != null ? event.durationMs / maxDurationMs : 0;
  const isCondition = isConditionTimelineEvent(event);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(event.eventId)}
      onKeyDown={(nativeEvent) => {
        if (nativeEvent.key === "Enter" || nativeEvent.key === " ") {
          nativeEvent.preventDefault();
          onSelect(event.eventId);
        }
      }}
      aria-pressed={isSelected}
      aria-label={`${event.stepName} — ${visual.label}`}
      className={cn(
        "w-full text-left p-3 rounded-lg flex flex-col gap-1.5 transition-all border outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring",
        isSelected
          ? "bg-primary/5 border-primary/30 shadow-sm"
          : "bg-transparent border-transparent hover:bg-muted/30",
        isActive && "ring-1 ring-primary/40",
        isDimmed && "opacity-45",
      )}
    >
      {/* Row 1: status + method + name + badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn(visual.color, visual.animated && "animate-pulse")}>
            {isCondition ? <GitBranch className="h-3.5 w-3.5" /> : ICON_MAP[visual.icon]}
          </span>
          {isRequestTimelineEvent(event) ? (
            <span
              className={cn(
                "font-mono font-bold text-[10px] shrink-0",
                METHOD_COLORS[event.method] || "text-foreground",
              )}
            >
              {event.method}
            </span>
          ) : (
            <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-amber-700">
              Condition
            </span>
          )}
          <span className="text-xs font-medium truncate text-foreground/80">{event.stepName}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isRequestTimelineEvent(event) && event.preRequestPassed != null && (
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
          {isRequestTimelineEvent(event) && event.testsPassed != null && (
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
          {isRequestTimelineEvent(event) && event.httpStatus != null && (
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
          {isCondition && event.resultLabel && (
            <span className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary">
              {event.resultLabel}
            </span>
          )}
          {isRequestTimelineEvent(event) && event.routeDecision?.chosenHandleId && (
            <span className="rounded-md border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[9px] text-sky-700">
              {event.routeDecision.chosenHandleId === "success" ? "SUCCESS ROUTE" : "FAIL ROUTE"}
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
        {isRequestTimelineEvent(event) && event.responseSize != null && (
          <span>{formatBytes(event.responseSize)}</span>
        )}
        {isRequestTimelineEvent(event) && event.errorSnapshot && (
          <span className="text-destructive truncate">{event.errorSnapshot.message}</span>
        )}
        {isCondition && (
          <span className="truncate">
            {event.expressionSummary}
            {event.affectedExecutedNodeIds.length > 0
              ? ` · ${event.affectedExecutedNodeIds.length} ran`
              : ""}
            {event.affectedSkippedNodeIds.length > 0
              ? ` · ${event.affectedSkippedNodeIds.length} skipped`
              : ""}
          </span>
        )}
      </div>

      {isCondition && (
        <div className="flex flex-wrap items-center gap-1.5">
          {event.chosenRouteId && (
            <button
              type="button"
              className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-700"
              onClick={(nativeEvent) => {
                nativeEvent.stopPropagation();
                focusRoute({
                  conditionEventId: event.eventId,
                  routeId: event.chosenRouteId!,
                  mode: "chosen",
                });
              }}
            >
              {event.chosenHandleId?.toUpperCase() ?? "SELECTED"}
            </button>
          )}
          {event.skippedRouteIds[0] && (
            <button
              type="button"
              className="rounded-md border border-muted-foreground/20 bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground"
              onClick={(nativeEvent) => {
                nativeEvent.stopPropagation();
                focusRoute({
                  conditionEventId: event.eventId,
                  routeId: event.skippedRouteIds[0]!,
                  mode: "skipped",
                });
              }}
            >
              {event.skippedRouteIds.length === 1
                ? "Skipped path"
                : `${event.skippedRouteIds.length} skipped`}
            </button>
          )}
        </div>
      )}

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
    </div>
  );
});
