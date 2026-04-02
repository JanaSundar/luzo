import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TimelinePanel } from "@/components/pipelines/TimelinePanel";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { useTimelineStore } from "@/stores/useTimelineStore";
import { render } from "@/utils/test-utils";
import type { TimelineEvent } from "@/types/timeline-event";

const pipelineStoreState = {
  activePipelineId: "pipeline-1",
  pipelines: [
    {
      id: "pipeline-1",
      name: "Test Pipeline",
      steps: [
        {
          id: "step-1",
          name: "Step 1",
          method: "GET",
          url: "https://api.example.com/step-1",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-2",
          name: "Final step",
          method: "GET",
          url: "https://api.example.com/step-2",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
      ],
    },
  ],
  setSelectedNodeId: vi.fn(),
};

vi.mock("@/stores/usePipelineStore", () => ({
  usePipelineStore: vi.fn((selector?: (state: typeof pipelineStoreState) => unknown) =>
    selector ? selector(pipelineStoreState) : pipelineStoreState,
  ),
}));

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    eventId: "exec-1:step-1",
    executionId: "exec-1",
    stepId: "step-1",
    stepName: "Step 1",
    stageIndex: 0,
    branchId: null,
    status: "completed",
    method: "GET",
    url: "https://api.example.com/step-1",
    timestamp: 1000,
    startedAt: 1000,
    endedAt: 1100,
    durationMs: 100,
    sequenceNumber: 0,
    retryCount: 0,
    inputSnapshot: {
      method: "GET",
      url: "https://api.example.com/step-1",
      headers: {},
      body: null,
    },
    outputSnapshot: {
      status: 200,
      statusText: "OK",
      headers: {},
      body: '{"ok":true}',
      latencyMs: 100,
      sizeBytes: 12,
    },
    errorSnapshot: null,
    httpStatus: 200,
    responseSize: 12,
    isMock: false,
    preRequestPassed: null,
    postRequestPassed: null,
    testsPassed: null,
    ...overrides,
  };
}

describe("TimelinePanel", () => {
  beforeEach(() => {
    usePipelineExecutionStore.getState().reset();
    useTimelineStore.getState().reset();
    vi.mocked(usePipelineStore).mockClear();
    pipelineStoreState.setSelectedNodeId.mockClear();
  });

  it("preserves manual selection after execution completes", async () => {
    const firstEvent = makeEvent();
    const lastEvent = makeEvent({
      eventId: "exec-1:step-2",
      stepId: "step-2",
      stepName: "Final step",
      url: "https://api.example.com/final",
      sequenceNumber: 1,
      timestamp: 1200,
      startedAt: 1200,
      endedAt: 1350,
      durationMs: 150,
      httpStatus: 201,
      outputSnapshot: {
        status: 201,
        statusText: "Created",
        headers: {},
        body: '{"done":true}',
        latencyMs: 150,
        sizeBytes: 14,
      },
    });

    usePipelineExecutionStore.setState((state) => ({
      ...state,
      status: "completed",
    }));
    useTimelineStore.setState((state) => ({
      ...state,
      eventById: new Map([
        [firstEvent.eventId, firstEvent],
        [lastEvent.eventId, lastEvent],
      ]),
      orderedIds: [firstEvent.eventId, lastEvent.eventId],
      selectedEventId: firstEvent.eventId,
      executionId: "exec-1",
      syncGeneration: state.syncGeneration + 1,
    }));

    render(<TimelinePanel />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /step 1/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
    expect(screen.getByText("https://api.example.com/step-1")).toBeInTheDocument();
  });

  it("does not change the builder selection when a timeline row is selected", async () => {
    const user = userEvent.setup();
    const firstEvent = makeEvent();
    const lastEvent = makeEvent({
      eventId: "exec-1:step-2",
      stepId: "step-2",
      stepName: "Final step",
      sequenceNumber: 1,
    });

    usePipelineExecutionStore.setState((state) => ({
      ...state,
      status: "completed",
    }));
    useTimelineStore.setState((state) => ({
      ...state,
      eventById: new Map([
        [firstEvent.eventId, firstEvent],
        [lastEvent.eventId, lastEvent],
      ]),
      orderedIds: [firstEvent.eventId, lastEvent.eventId],
      selectedEventId: firstEvent.eventId,
      executionId: "exec-1",
      syncGeneration: state.syncGeneration + 1,
    }));

    render(<TimelinePanel />);

    await user.click(screen.getByRole("button", { name: /final step/i }));

    expect(useTimelineStore.getState().selectedEventId).toBe(lastEvent.eventId);
    expect(pipelineStoreState.setSelectedNodeId).not.toHaveBeenCalled();
  });
});
