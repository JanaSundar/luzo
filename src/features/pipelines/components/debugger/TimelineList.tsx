"use client";

import { Circle, Pause } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils";
import type { TimelineEvent } from "@/types/timeline-event";
import { TimelineEventRow } from "./TimelineEventRow";

type TimelineFilter = "all" | "failed" | "executed" | "skipped" | "decisions";

const FILTER_LABELS: Record<TimelineFilter, string> = {
  all: "All",
  failed: "Failed",
  executed: "Executed",
  skipped: "Skipped",
  decisions: "Decisions",
};

function matchesFilter(event: TimelineEvent, filter: TimelineFilter): boolean {
  if (filter === "failed") return event.status === "failed";
  if (filter === "executed") return event.outcome === "executed";
  if (filter === "skipped") return event.status === "skipped";
  if (filter === "decisions") return event.eventKind === "route_selected";
  return true;
}

// ─── Component ──────────────────────────────────────────────────────
interface TimelineListProps {
  events: TimelineEvent[];
  selectedEventId: string | null;
  activeEventId: string | null;
  isPaused: boolean;
  isRunning: boolean;
  currentStepIndex: number;
  totalSteps: number;
  onSelectEvent: (eventId: string) => void;
}

export function TimelineList({
  events,
  selectedEventId,
  activeEventId,
  isPaused,
  isRunning,
  currentStepIndex,
  totalSteps,
  onSelectEvent,
}: TimelineListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<TimelineFilter>("all");

  const filteredEvents = useMemo(
    () => events.filter((event) => matchesFilter(event, filter)),
    [events, filter],
  );
  const maxDurationMs = useMemo(
    () => Math.max(...filteredEvents.map((event) => event.durationMs ?? 0), 0),
    [filteredEvents],
  );

  // Auto-scroll to bottom on new events during live execution
  const prevCountRef = useRef(events.length);
  useEffect(() => {
    if (events.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevCountRef.current = events.length;
  }, [events.length]);

  const handleSelect = useCallback((eventId: string) => onSelectEvent(eventId), [onSelectEvent]);

  return (
    <div className="lg:col-span-3 border-r flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b bg-muted/10 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Execution Timeline
          </h3>
          <span className="text-[10px] font-mono text-muted-foreground">
            {filteredEvents.length}/{events.length} events
          </span>
        </div>

        <div className="mt-2 flex items-center gap-1 overflow-x-auto pb-1">
          {(["all", "failed", "executed", "skipped", "decisions"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-md border px-2 py-1 text-[10px] font-medium transition-colors",
                filter === value
                  ? "border-border/70 bg-background text-foreground"
                  : "border-transparent bg-transparent text-muted-foreground hover:border-border/45 hover:bg-background/70 hover:text-foreground",
              )}
            >
              {FILTER_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {filteredEvents.map((event) => (
          <TimelineEventRow
            key={event.eventId}
            event={event}
            baselineTimestamp={events[0]?.startedAt ?? events[0]?.timestamp ?? null}
            maxDurationMs={maxDurationMs}
            isSelected={selectedEventId === event.eventId}
            isActive={activeEventId === event.eventId}
            onSelect={handleSelect}
          />
        ))}

        {/* Paused indicator */}
        {isPaused && currentStepIndex < totalSteps && (
          <div
            className={cn(
              "p-3 rounded-lg border flex items-center gap-3",
              "bg-amber-500/5 border-amber-500/20",
            )}
          >
            <Pause className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-600">
              Paused — click Step or Continue
            </span>
          </div>
        )}

        {/* Running indicator */}
        {isRunning && (
          <div
            className={cn(
              "p-3 rounded-lg border flex items-center gap-3 animate-pulse",
              "bg-muted/20 border-border/50",
            )}
          >
            <Circle className="h-3.5 w-3.5 text-primary animate-ping" />
            <span className="text-xs font-medium text-muted-foreground">Executing…</span>
          </div>
        )}

        {!isRunning && filteredEvents.length === 0 && (
          <div className="p-3 text-xs text-muted-foreground">
            No events match the current filter.
          </div>
        )}
      </div>
    </div>
  );
}
