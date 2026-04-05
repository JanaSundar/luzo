"use client";

import { useCallback, useEffect, useMemo } from "react";
import { getPipelineExecutionLayout } from "@/lib/pipeline/execution-plan";
import {
  derivePanelState,
  selectActiveEvent,
  selectSelectedEvent,
  selectSortedEvents,
} from "@/lib/pipeline/timeline/timeline-selectors";
import { usePipelineExecutionStore } from "@/lib/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { useTimelineStore } from "@/lib/stores/useTimelineStore";
import { useGraphWorker } from "@/lib/workers/useGraphWorker";
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

  const layoutByStep = useMemo(
    () => (pipeline ? getPipelineExecutionLayout(pipeline.steps) : new Map()),
    [pipeline],
  );

  const syncFromExecution = useTimelineStore((s) => s.syncFromExecution);
  const { requestGraphIndex } = useGraphWorker();
  const selectEvent = useTimelineStore((s) => s.selectEvent);
  const selectedEventId = useTimelineStore((s) => s.selectedEventId);

  // Request an off-thread FlowGraphIndex build whenever the pipeline structure
  // changes. The result is stored via setPrebuiltGraphIndex and reused by
  // every subsequent syncFromExecution call, avoiding O(V²/32) work on-thread.
  useEffect(() => {
    requestGraphIndex(pipeline?.flow);
  }, [pipeline?.flow, requestGraphIndex]);

  useEffect(() => {
    if (!executionId || snapshots.length === 0) return;
    syncFromExecution(snapshots, executionId, layoutByStep, {
      executionStatus,
      flow: pipeline?.flow,
    });
  }, [executionId, executionStatus, layoutByStep, pipeline?.flow, snapshots, syncFromExecution]);

  const syncGeneration = useTimelineStore((s) => s.syncGeneration);
  const highlightedEventIds = useTimelineStore((s) => s.highlightedEventIds);
  const activeRouteFocus = useTimelineStore((s) => s.activeRouteFocus);
  const storeState = useTimelineStore.getState();

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

  useEffect(() => {
    if (sortedEvents.length === 0) return;

    const hasValidSelection = selectedEventId
      ? sortedEvents.some((event) => event.eventId === selectedEventId)
      : false;

    if (!hasValidSelection) {
      selectEvent(sortedEvents[0]!.eventId);
      return;
    }

    if (executionStatus === "running" && autoFollowEventId) {
      selectEvent(autoFollowEventId);
    }
  }, [autoFollowEventId, executionStatus, selectEvent, selectedEventId, sortedEvents]);

  const panelState = derivePanelState(executionStatus, sortedEvents.length);

  const handleSelectEvent = useCallback((eventId: string) => selectEvent(eventId), [selectEvent]);

  if (panelState === "empty") return <TimelineEmpty />;
  if (panelState === "loading") return <TimelineLoading />;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-xl border bg-background shadow-sm lg:grid-cols-12">
      <TimelineList
        events={sortedEvents}
        selectedEventId={selectedEventId}
        activeEventId={activeEvent?.eventId ?? null}
        isPaused={executionStatus === "paused"}
        isRunning={executionStatus === "running"}
        highlightedEventIds={highlightedEventIds}
        activeRouteFocus={activeRouteFocus}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        onSelectEvent={handleSelectEvent}
      />

      <div className="flex min-h-0 flex-1 flex-col border-t lg:col-span-9 lg:border-t-0 lg:border-l">
        {panelState === "error" && !selectedEvent ? (
          <TimelineError message={errorMessage} />
        ) : (
          <TimelineDetailPane event={selectedEvent} />
        )}
      </div>
    </div>
  );
}
