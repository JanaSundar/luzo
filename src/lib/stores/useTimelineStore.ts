import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { PipelineExecutionLayout } from "@/lib/pipeline/execution-plan";
import { snapshotToTimelineEvent } from "@/lib/pipeline/timeline/event-adapter";
import { usePipelineExecutionStore } from "@/lib/stores/usePipelineExecutionStore";
import type { StepSnapshot } from "@/types/pipeline-runtime";
import type { TimelineEvent } from "@/types/timeline-event";

// ─── Store shape ────────────────────────────────────────────────────
// Normalized: Map for O(1) lookup + ordered array for O(1) append.
// syncGeneration is a monotonic counter — cheap equality check for
// selector memoization without deep-comparing the Map.

interface TimelineState {
  eventById: Map<string, TimelineEvent>;
  orderedIds: string[];
  selectedEventId: string | null;
  executionId: string | null;
  syncGeneration: number;
}

interface TimelineActions {
  syncFromExecution: (
    snapshots: StepSnapshot[],
    executionId: string,
    layoutByStep: Map<string, PipelineExecutionLayout>,
  ) => void;
  selectEvent: (eventId: string | null) => void;
  reset: () => void;
}

const INITIAL_STATE: TimelineState = {
  eventById: new Map(),
  orderedIds: [],
  selectedEventId: null,
  executionId: null,
  syncGeneration: 0,
};

export const useTimelineStore = create<TimelineState & TimelineActions>()(
  immer((set) => ({
    ...INITIAL_STATE,

    /**
     * Syncs timeline events from execution snapshots.
     *
     * Complexity: O(n) where n = snapshots.length
     * - Iterates all snapshots once
     * - Map.set and array push are O(1) each
     * - Bumps syncGeneration once at end
     *
     * Design: Rebuilds events from snapshots rather than diffing,
     * because snapshots are already the source of truth and the
     * controller replaces the entire array on each update.
     */
    syncFromExecution: (snapshots, executionId, layoutByStep) =>
      set((state) => {
        const isNewExecution = state.executionId !== executionId;

        if (isNewExecution) {
          state.eventById = new Map();
          state.orderedIds = [];
          state.selectedEventId = null;
          state.executionId = executionId;
        }

        // Track existing event ids for detecting new entries
        const existingIds = new Set(state.orderedIds);

        for (const snapshot of snapshots) {
          const event = snapshotToTimelineEvent(
            snapshot,
            executionId,
            layoutByStep.get(snapshot.stepId),
          );

          state.eventById.set(event.eventId, event);

          if (!existingIds.has(event.eventId)) {
            state.orderedIds.push(event.eventId);
            existingIds.add(event.eventId);
          }
        }

        state.syncGeneration += 1;
      }),

    selectEvent: (eventId) =>
      set((state) => {
        state.selectedEventId = eventId;
      }),

    reset: () =>
      set((state) => {
        state.eventById = new Map();
        state.orderedIds = [];
        state.selectedEventId = null;
        state.executionId = null;
        state.syncGeneration = 0;
      }),
  })),
);

// ─── Auto-sync subscription ────────────────────────────────────────
// Subscribes to execution store changes and syncs timeline events.
// Uses a stable subscription (module-level) so it runs once.
// The layoutByStep is passed as empty Map when not available — the
// UI components will provide it via the sync call.

let lastSnapshotRef: StepSnapshot[] | null = null;

usePipelineExecutionStore.subscribe((execState) => {
  const { snapshots, executionId } = execState;

  // Skip if snapshots reference hasn't changed (referential equality)
  if (snapshots === lastSnapshotRef) return;
  lastSnapshotRef = snapshots;

  if (!executionId || snapshots.length === 0) {
    const timelineState = useTimelineStore.getState();
    if (timelineState.orderedIds.length > 0) {
      useTimelineStore.getState().reset();
    }
    return;
  }

  // Layout map is populated by the component that has access to the pipeline.
  // For auto-sync, we use an empty map and let TimelinePanel enrich events
  // with execution layout metadata during its explicit sync.
  useTimelineStore.getState().syncFromExecution(snapshots, executionId, new Map());
});
