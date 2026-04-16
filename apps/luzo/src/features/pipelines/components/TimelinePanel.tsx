"use client";

import { useCallback, useEffect, useMemo } from "react";
import { buildPipelineRunDiff } from "@/features/pipeline/run-diff";
import { usePipelineArtifactsStore } from "@/stores/usePipelineArtifactsStore";
import {
  derivePanelState,
  selectActiveEvent,
  selectSelectedEvent,
  selectSortedEvents,
} from "@/features/pipeline/timeline/timeline-selectors";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { useTimelineStore } from "@/stores/useTimelineStore";
import { TimelineDetailPane } from "./debugger/TimelineDetailPane";
import { TimelineEmpty, TimelineError, TimelineLoading } from "./debugger/TimelineEmptyState";
import { TimelineList } from "./debugger/TimelineList";

export function TimelinePanel() {
  const executionStatus = usePipelineExecutionStore((s) => s.status);
  const snapshots = usePipelineExecutionStore((s) => s.snapshots);
  const executionId = usePipelineExecutionStore((s) => s.executionId);
  const currentStepIndex = usePipelineExecutionStore((s) => s.currentStepIndex);
  const totalSteps = usePipelineExecutionStore((s) => s.totalSteps);
  const errorMessage = usePipelineExecutionStore((s) => s.errorMessage);

  const pipeline = usePipelineStore((s) =>
    s.activePipelineId ? s.pipelines.find((p) => p.id === s.activePipelineId) : null,
  );
  const baseline = usePipelineArtifactsStore((s) =>
    pipeline ? s.getBaselineArtifact(pipeline.id) : null,
  );
  const currentArtifact = usePipelineArtifactsStore((s) =>
    pipeline ? s.getExecutionArtifact(pipeline.id) : null,
  );

  const syncFromExecution = useTimelineStore((s) => s.syncFromExecution);
  const selectEvent = useTimelineStore((s) => s.selectEvent);
  const selectedEventId = useTimelineStore((s) => s.selectedEventId);

  useEffect(() => {
    if (!executionId || snapshots.length === 0 || !pipeline) return;
    syncFromExecution(snapshots, executionId, pipeline);
  }, [executionId, pipeline, snapshots, syncFromExecution]);

  const syncGeneration = useTimelineStore((s) => s.syncGeneration);
  const storeState = useTimelineStore.getState();
  const diff = useMemo(() => {
    if (!currentArtifact || !baseline) return null;
    return buildPipelineRunDiff(currentArtifact, baseline);
  }, [baseline, currentArtifact]);

  const sortedEvents = useMemo(
    () => selectSortedEvents(storeState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [syncGeneration],
  );
  const selectedEvent = useMemo(
    () => selectSelectedEvent(storeState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [syncGeneration, selectedEventId],
  );
  const activeEvent = useMemo(
    () => selectActiveEvent(storeState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [syncGeneration],
  );

  const latestEventId = sortedEvents.at(-1)?.eventId ?? null;
  const autoFollowEventId = activeEvent?.eventId ?? latestEventId;
  const shouldAutoFollow = executionStatus === "running";

  useEffect(() => {
    if (sortedEvents.length === 0) return;

    const hasValidSelection = selectedEventId
      ? sortedEvents.some((event) => event.eventId === selectedEventId)
      : false;

    if (!hasValidSelection) {
      selectEvent(autoFollowEventId ?? sortedEvents.at(-1)!.eventId);
      return;
    }

    if (shouldAutoFollow && autoFollowEventId && selectedEventId !== autoFollowEventId) {
      selectEvent(autoFollowEventId);
    }
  }, [autoFollowEventId, selectEvent, selectedEventId, shouldAutoFollow, sortedEvents]);

  const panelState = derivePanelState(executionStatus, sortedEvents.length);

  const handleSelectEvent = useCallback(
    (eventId: string) => {
      selectEvent(eventId);
    },
    [selectEvent],
  );

  if (panelState === "empty") return <TimelineEmpty />;
  if (panelState === "loading") return <TimelineLoading />;

  return (
    <div className="grid h-full min-h-0 min-w-0 grid-cols-1 overflow-hidden rounded-xl border bg-background shadow-sm lg:grid-cols-12">
      <TimelineList
        events={sortedEvents}
        diffByStepId={diff?.stepsById ?? null}
        selectedEventId={selectedEventId}
        activeEventId={activeEvent?.eventId ?? null}
        isPaused={executionStatus === "paused"}
        isRunning={executionStatus === "running"}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        onSelectEvent={handleSelectEvent}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-t lg:col-span-9 lg:border-t-0 lg:border-l">
        {panelState === "error" && !selectedEvent ? (
          <TimelineError message={errorMessage} />
        ) : (
          <TimelineDetailPane diff={diff} event={selectedEvent} />
        )}
      </div>
    </div>
  );
}
