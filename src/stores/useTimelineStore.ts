import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { PipelineStep } from "@/types";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import type { StepSnapshot } from "@/types/pipeline-runtime";
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

let lastSnapshotRef: StepSnapshot[] | null = null;

usePipelineExecutionStore.subscribe((execState) => {
  const { snapshots, executionId } = execState;

  if (snapshots === lastSnapshotRef) return;
  lastSnapshotRef = snapshots;

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

  void useTimelineStore.getState().syncFromExecution(snapshots, executionId, activePipeline.steps);
});
