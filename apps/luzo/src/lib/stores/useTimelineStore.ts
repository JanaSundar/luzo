import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { FlowDocument } from "@/features/flow-editor/domain/types";
import type { PipelineExecutionLayout } from "@/lib/pipeline/execution-plan";
import { buildTimelineEvents } from "@/lib/pipeline/timeline/condition-events";
import { snapshotToTimelineEvent } from "@/lib/pipeline/timeline/event-adapter";
import {
  bitsetToNodeIds,
  buildFlowGraphIndex,
  type FlowGraphIndex,
} from "@/lib/pipeline/timeline/flow-graph";
import { usePipelineExecutionStore } from "@/lib/stores/usePipelineExecutionStore";
import type { DebugStatus, StepSnapshot } from "@/types/pipeline-runtime";
import type { ConditionTimelineEvent, TimelineEvent } from "@/types/timeline-event";

// ─── Store shape ────────────────────────────────────────────────────
// Normalized: Map for O(1) lookup + ordered array for O(1) append.
// syncGeneration is a monotonic counter — cheap equality check for
// selector memoization without deep-comparing the Map.

interface TimelineState {
  eventById: Map<string, TimelineEvent>;
  orderedIds: string[];
  selectedEventId: string | null;
  executionId: string | null;
  eventIdsByNodeId: Map<string, string[]>;
  conditionDecisionByEventId: Map<string, ConditionTimelineEvent>;
  routeScopeByRouteId: Map<string, Uint32Array>;
  sharedDownstreamByConditionEventId: Map<string, Uint32Array>;
  highlightedEventIds: Set<string>;
  activeRouteFocus: {
    conditionEventId: string;
    routeId: string;
    mode: "chosen" | "skipped";
  } | null;
  graphIndex: FlowGraphIndex | null;
  syncGeneration: number;
}

interface TimelineActions {
  syncFromExecution: (
    snapshots: StepSnapshot[],
    executionId: string,
    layoutByStep: Map<string, PipelineExecutionLayout>,
    options?: { executionStatus?: DebugStatus; flow?: FlowDocument | null },
  ) => void;
  /**
   * Pre-build and cache the FlowGraphIndex for a given flow document.
   * Call this once when the pipeline loads or its structure changes
   * (blocks/connections added or removed) so that syncFromExecution can
   * reuse it rather than rebuilding on every streaming chunk.
   */
  setGraphIndex: (flow: FlowDocument | null | undefined) => void;
  /**
   * Store a FlowGraphIndex that was already built — typically by the graph
   * worker. Prefer this over setGraphIndex when the index is built off-thread.
   */
  setPrebuiltGraphIndex: (index: FlowGraphIndex | null) => void;
  selectEvent: (eventId: string | null) => void;
  focusRoute: (focus: TimelineState["activeRouteFocus"]) => void;
  reset: () => void;
}

const INITIAL_STATE: TimelineState = {
  eventById: new Map(),
  orderedIds: [],
  selectedEventId: null,
  executionId: null,
  eventIdsByNodeId: new Map(),
  conditionDecisionByEventId: new Map(),
  routeScopeByRouteId: new Map(),
  sharedDownstreamByConditionEventId: new Map(),
  highlightedEventIds: new Set(),
  activeRouteFocus: null,
  graphIndex: null,
  syncGeneration: 0,
};

function resetTimelineState(state: TimelineState) {
  state.eventById = new Map();
  state.orderedIds = [];
  state.selectedEventId = null;
  state.executionId = null;
  state.eventIdsByNodeId = new Map();
  state.conditionDecisionByEventId = new Map();
  state.routeScopeByRouteId = new Map();
  state.sharedDownstreamByConditionEventId = new Map();
  state.highlightedEventIds = new Set();
  state.activeRouteFocus = null;
  state.graphIndex = null;
  state.syncGeneration = 0;
}

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
    syncFromExecution: (snapshots, executionId, layoutByStep, options) =>
      set((state) => {
        const isNewExecution = state.executionId !== executionId;

        if (isNewExecution) {
          state.eventById = new Map();
          state.orderedIds = [];
          state.selectedEventId = null;
          state.executionId = executionId;
          state.activeRouteFocus = null;
          state.highlightedEventIds = new Set();
        }

        const baseEvents = buildBaseEventsIncremental(snapshots, executionId, layoutByStep);
        const normalized = buildTimelineEvents({
          executionId,
          executionStatus: options?.executionStatus ?? usePipelineExecutionStore.getState().status,
          flow: options?.flow,
          // Pass the pre-built index — skips O(V+E) buildFlowGraphIndex on every streaming chunk.
          // Falls back to null so buildTimelineEvents computes it when setGraphIndex hasn't been called.
          graphIndex: state.graphIndex,
          layoutByStep,
          baseEvents,
        });

        state.eventById = new Map(normalized.events.map((event) => [event.eventId, event]));
        state.orderedIds = normalized.events.map((event) => event.eventId);
        state.eventIdsByNodeId = normalized.events.reduce((map, event) => {
          map.set(event.stepId, [...(map.get(event.stepId) ?? []), event.eventId]);
          return map;
        }, new Map<string, string[]>());
        state.conditionDecisionByEventId = normalized.indexes.conditionDecisionByEventId;
        state.routeScopeByRouteId = normalized.indexes.routeScopeByRouteId;
        state.sharedDownstreamByConditionEventId =
          normalized.indexes.sharedDownstreamByConditionEventId;
        state.graphIndex = normalized.graph;
        applyRouteFocus(state);
        state.syncGeneration += 1;
      }),

    setGraphIndex: (flow) =>
      set((state) => {
        state.graphIndex = buildFlowGraphIndex(flow);
      }),

    setPrebuiltGraphIndex: (index) =>
      set((state) => {
        state.graphIndex = index;
      }),

    focusRoute: (focus) =>
      set((state) => {
        state.activeRouteFocus =
          state.activeRouteFocus &&
          focus &&
          state.activeRouteFocus.conditionEventId === focus.conditionEventId &&
          state.activeRouteFocus.routeId === focus.routeId &&
          state.activeRouteFocus.mode === focus.mode
            ? null
            : focus;
        applyRouteFocus(state);
        state.syncGeneration += 1;
      }),

    selectEvent: (eventId) =>
      set((state) => {
        state.selectedEventId = eventId;
      }),

    reset: () =>
      set((state) => {
        resetTimelineState(state);
      }),
  })),
);

// ─── Incremental base-event cache ──────────────────────────────────
// Avoids re-projecting unchanged StepSnapshot objects on every streaming
// chunk. Lives outside the store because it is not reactive state.
// Immer always creates a new object reference when a snapshot is mutated,
// so referential equality (===) is a safe staleness check per entry.

let _baseEventExecutionId: string | null = null;
let _baseEventInputCache: StepSnapshot[] = [];
let _baseEventOutputCache: TimelineEvent[] = [];

function buildBaseEventsIncremental(
  snapshots: StepSnapshot[],
  executionId: string,
  layoutByStep: Map<string, PipelineExecutionLayout>,
): TimelineEvent[] {
  if (executionId !== _baseEventExecutionId) {
    _baseEventExecutionId = executionId;
    _baseEventInputCache = [];
    _baseEventOutputCache = [];
  }

  const events = new Array<TimelineEvent>(snapshots.length);
  for (let i = 0; i < snapshots.length; i++) {
    const snapshot = snapshots[i]!;
    if (
      i < _baseEventInputCache.length &&
      snapshot === _baseEventInputCache[i] &&
      _baseEventOutputCache[i]
    ) {
      // Snapshot reference unchanged — reuse cached projection.
      events[i] = _baseEventOutputCache[i]!;
    } else {
      events[i] = snapshotToTimelineEvent(snapshot, executionId, layoutByStep.get(snapshot.stepId));
    }
  }

  // Store the input array reference (not a copy) — Immer replaces the outer
  // array on each update, so individual element comparisons stay correct.
  _baseEventInputCache = snapshots;
  _baseEventOutputCache = events;

  return events;
}

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

function applyRouteFocus(state: TimelineState) {
  if (!state.activeRouteFocus || !state.graphIndex) {
    state.highlightedEventIds = new Set();
    return;
  }

  const routeScope = state.routeScopeByRouteId.get(state.activeRouteFocus.routeId);
  if (!routeScope) {
    state.highlightedEventIds = new Set();
    return;
  }

  const nodeIds = bitsetToNodeIds(routeScope, state.graphIndex);
  const highlighted = new Set<string>();
  nodeIds.forEach((nodeId) => {
    (state.eventIdsByNodeId.get(nodeId) ?? []).forEach((eventId) => highlighted.add(eventId));
  });
  highlighted.add(state.activeRouteFocus.conditionEventId);
  state.highlightedEventIds = highlighted;
}
