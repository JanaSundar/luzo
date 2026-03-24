import type { DebugStatus } from "@/types/pipeline-runtime";
import type { TimelineEvent, TimelineEventStatus } from "@/types/timeline-event";
import type { DebugPanelState } from "./status-config";

// ─── Types ──────────────────────────────────────────────────────────

interface TimelineStoreState {
  eventById: Map<string, TimelineEvent>;
  orderedIds: string[];
  selectedEventId: string | null;
}

export interface StageGroup {
  stageIndex: number;
  isParallel: boolean;
  eventIds: string[];
}

// ─── Selectors ──────────────────────────────────────────────────────
// Pure functions over normalized store state.
// All selectors are O(n) single-pass — no nested loops or re-sorting.

/**
 * Returns events in deterministic order (by sequenceNumber, then by stepId for ties).
 * O(n) — orderedIds are already in insertion order which matches pipeline order.
 * We sort lazily here because parallel step snapshots may arrive out of order.
 */
export function selectSortedEvents(state: TimelineStoreState): TimelineEvent[] {
  const events = state.orderedIds
    .map((id) => state.eventById.get(id))
    .filter((e): e is TimelineEvent => e != null);

  // Stable sort by sequenceNumber (primary), stepId (stable tiebreaker)
  return events.sort((a, b) => {
    const seqDiff = a.sequenceNumber - b.sequenceNumber;
    if (seqDiff !== 0) return seqDiff;
    return a.stepId.localeCompare(b.stepId);
  });
}

/**
 * Groups events by stageIndex. O(n) single pass.
 * Returns groups in stage order with parallel flag.
 */
export function selectGroupedByStage(state: TimelineStoreState): StageGroup[] {
  const groupMap = new Map<number, string[]>();
  const parallelSet = new Set<number>();

  for (const id of state.orderedIds) {
    const event = state.eventById.get(id);
    if (!event) continue;

    const existing = groupMap.get(event.stageIndex);
    if (existing) {
      existing.push(id);
    } else {
      groupMap.set(event.stageIndex, [id]);
    }

    if (event.branchId) {
      parallelSet.add(event.stageIndex);
    }
  }

  return Array.from(groupMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([stageIndex, eventIds]) => ({
      stageIndex,
      isParallel: parallelSet.has(stageIndex),
      eventIds,
    }));
}

/**
 * Returns the selected event or null. O(1) via Map lookup.
 */
export function selectSelectedEvent(state: TimelineStoreState): TimelineEvent | null {
  if (!state.selectedEventId) return null;
  return state.eventById.get(state.selectedEventId) ?? null;
}

/**
 * Returns the currently active (running) event, if any. O(n) scan.
 */
export function selectActiveEvent(state: TimelineStoreState): TimelineEvent | null {
  for (const id of state.orderedIds) {
    const event = state.eventById.get(id);
    if (event?.status === "running") return event;
  }
  return null;
}

/**
 * Derives the panel display state from execution status.
 */
export function derivePanelState(
  executionStatus: DebugStatus,
  eventCount: number,
): DebugPanelState {
  if (eventCount === 0 && executionStatus === "idle") return "empty";
  if (eventCount === 0 && executionStatus === "running") return "loading";
  if (executionStatus === "running" || executionStatus === "paused") return "live";
  if (executionStatus === "error") return "error";
  return "done";
}

/**
 * Computes summary stats from events. O(n) single pass.
 */
export function selectTimelineStats(state: TimelineStoreState) {
  let running = 0;
  let completed = 0;
  let failed = 0;
  let totalDurationMs = 0;

  const completedStatuses: TimelineEventStatus[] = ["completed"];
  const failedStatuses: TimelineEventStatus[] = ["failed"];

  for (const id of state.orderedIds) {
    const event = state.eventById.get(id);
    if (!event) continue;

    if (event.status === "running") running++;
    if (completedStatuses.includes(event.status)) completed++;
    if (failedStatuses.includes(event.status)) failed++;
    if (event.durationMs != null) totalDurationMs += event.durationMs;
  }

  return { running, completed, failed, total: state.orderedIds.length, totalDurationMs };
}
