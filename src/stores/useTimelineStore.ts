"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { PipelineStep } from "@/types";
import type { PipelineExecutionLayout } from "@/features/pipeline/execution-plan";
import { snapshotToTimelineEvent } from "@/features/pipeline/timeline/event-adapter";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import type { PipelineExecutionEvent, StepSnapshot } from "@/types/pipeline-runtime";
import type { TimelineEvent } from "@/types/timeline-event";
import { timelineWorkerClient } from "@/workers/client/timeline-client";
import type { Result } from "@/types/worker-results";
import type { TimelineIndex } from "@/types/workflow";

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
    steps: PipelineStep[],
  ) => Promise<void>;
  applyExecutionEvent: (
    event: PipelineExecutionEvent,
    executionId: string | null,
    layoutByStep?: Map<string, PipelineExecutionLayout>,
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

    syncFromExecution: async (snapshots, executionId, steps) => {
      const res = await timelineWorkerClient.callLatest<Result<TimelineIndex>>(
        "timeline-sync",
        async (api) => api.syncTimeline({ snapshots, executionId, steps }),
      );

      if (!res?.ok) return;

      const index = res.data;

      set((state) => {
        const isNewExecution = state.executionId !== executionId;

        if (isNewExecution) {
          state.selectedEventId = null;
          state.executionId = executionId;
        }

        state.eventById = new Map(Object.entries(index.byId));
        state.orderedIds = index.orderedEventIds;
        state.syncGeneration += 1;
      });
    },

    applyExecutionEvent: (event, executionId, layoutByStep) =>
      set((state) => {
        if (!executionId) return;

        if (event.type === "execution_started") {
          state.executionId = executionId;
          state.selectedEventId = null;
          return;
        }

        if (
          event.type !== "step_ready" &&
          event.type !== "step_stream_chunk" &&
          event.type !== "step_completed" &&
          event.type !== "step_failed"
        ) {
          return;
        }

        const timelineEvent = snapshotToTimelineEvent(
          event.snapshot,
          executionId,
          layoutByStep?.get(event.snapshot.stepId),
        );
        const isNew = !state.eventById.has(timelineEvent.eventId);
        state.eventById.set(timelineEvent.eventId, timelineEvent);
        if (isNew) {
          state.orderedIds.push(timelineEvent.eventId);
          state.orderedIds.sort((a, b) => {
            const left = state.eventById.get(a);
            const right = state.eventById.get(b);
            if (!left || !right) return a.localeCompare(b);
            return (
              left.sequenceNumber - right.sequenceNumber || left.stepId.localeCompare(right.stepId)
            );
          });
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

usePipelineExecutionStore.subscribe((execState, prevState) => {
  const { snapshots, executionId } = execState;

  if (snapshots === prevState.snapshots && executionId === prevState.executionId) return;

  if (!executionId || snapshots.length === 0) {
    const timelineState = useTimelineStore.getState();
    if (timelineState.orderedIds.length > 0) {
      useTimelineStore.getState().reset();
    }
    return;
  }

  const pipelineState = usePipelineStore.getState();
  const activePipeline = pipelineState.pipelines.find(
    (p) => p.id === pipelineState.activePipelineId,
  );

  if (!activePipeline) return;

  if (snapshots.length < prevState.snapshots.length || executionId !== prevState.executionId) {
    void useTimelineStore
      .getState()
      .syncFromExecution(snapshots, executionId, activePipeline.steps);
  }
});
