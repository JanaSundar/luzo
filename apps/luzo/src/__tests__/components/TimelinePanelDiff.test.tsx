import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { TimelinePanel } from "@/components/pipelines/TimelinePanel";
import { usePipelineArtifactsStore } from "@/stores/usePipelineArtifactsStore";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { useTimelineStore } from "@/stores/useTimelineStore";
import { render } from "@/utils/test-utils";
import type { TimelineEvent } from "@/types/timeline-event";

describe("TimelinePanel diffs", () => {
  beforeEach(() => {
    usePipelineExecutionStore.getState().reset();
    useTimelineStore.getState().reset();
    usePipelineStore.setState({
      activePipelineId: "pipeline-1",
      currentView: "builder",
      executing: false,
      executionResult: null,
      pipelines: [
        {
          createdAt: "",
          id: "pipeline-1",
          name: "Pipeline 1",
          narrativeConfig: { enabled: true, prompt: "", tone: "technical" },
          steps: [
            {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              id: "step-1",
              method: "GET",
              name: "Fetch users",
              params: [],
              url: "https://api.example.com/users",
            },
            {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              id: "step-2",
              method: "GET",
              name: "Fetch profile",
              params: [],
              url: "https://api.example.com/profile",
            },
          ],
          updatedAt: "",
        },
      ],
      selectedNodeIds: {},
    });
    usePipelineArtifactsStore.setState({
      baselineByPipelineId: {
        "pipeline-1": {
          artifact: makeArtifact("2026-04-14T01:00:00.000Z", {
            "step-1": 200,
            "step-2": 220,
          }),
          note: null,
          pinnedAt: "2026-04-14T01:30:00.000Z",
          sourceGeneratedAt: "2026-04-14T01:00:00.000Z",
        },
      },
      debuggerByPipelineId: {},
      executionByPipelineId: {
        "pipeline-1": makeArtifact("2026-04-15T01:00:00.000Z", {
          "step-1": 520,
          "step-2": 220,
        }),
      },
      reportsByPipelineId: {},
    });
    usePipelineExecutionStore.setState((state) => ({
      ...state,
      status: "completed",
    }));

    const firstEvent = makeEvent({
      eventId: "exec-1:step-1",
      stepId: "step-1",
      stepName: "Fetch users",
      url: "https://api.example.com/users",
    });
    const secondEvent = makeEvent({
      eventId: "exec-1:step-2",
      sequenceNumber: 1,
      stepId: "step-2",
      stepName: "Fetch profile",
      url: "https://api.example.com/profile",
    });

    useTimelineStore.setState((state) => ({
      ...state,
      eventById: new Map([
        [firstEvent.eventId, firstEvent],
        [secondEvent.eventId, secondEvent],
      ]),
      executionId: "exec-1",
      orderedIds: [firstEvent.eventId, secondEvent.eventId],
      selectedEventId: firstEvent.eventId,
      syncGeneration: state.syncGeneration + 1,
    }));
  });

  it("filters to regressions and renders the diff tab", async () => {
    const user = userEvent.setup();
    render(<TimelinePanel />);

    await user.click(screen.getByRole("button", { name: /regressions/i }));

    expect(screen.getByRole("button", { name: /fetch users/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /fetch profile/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /diff/i }));

    expect(screen.getByText(/latency increased by 320ms/i)).toBeInTheDocument();
  });
});

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    eventId: "exec-1:step-1",
    executionId: "exec-1",
    stepId: "step-1",
    stepName: "Fetch users",
    stageIndex: 0,
    branchId: null,
    status: "completed",
    method: "GET",
    url: "https://api.example.com/users",
    timestamp: 1000,
    startedAt: 1000,
    endedAt: 1100,
    durationMs: 100,
    sequenceNumber: 0,
    retryCount: 0,
    inputSnapshot: {
      method: "GET",
      url: "https://api.example.com/users",
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
    preRequestPassed: true,
    postRequestPassed: true,
    testsPassed: true,
    ...overrides,
  };
}

function makeArtifact(generatedAt: string, latencyByStepId: Record<string, number>) {
  return {
    generatedAt,
    pipelineId: "pipeline-1",
    pipelineStructureHash: "pipeline_hash",
    runtime: {
      completedAt: generatedAt,
      mode: "full" as const,
      reusedAliases: [],
      staleContextWarning: null,
      startStepId: null,
    },
    stepContextByAlias: {},
    steps: [
      {
        alias: "req1",
        completedAt: generatedAt,
        error: null,
        method: "GET" as const,
        postRequestPassed: true,
        preRequestPassed: true,
        reducedResponse: {
          headers: {},
          latencyMs: latencyByStepId["step-1"],
          sizeBytes: 128,
          status: 200,
          statusText: "OK",
          summary: { ok: true },
        },
        resolvedRequestSummary: {
          bodyPreview: null,
          headers: {},
          url: "https://api.example.com/users",
        },
        status: "success" as const,
        stepId: "step-1",
        stepName: "Fetch users",
        testsPassed: true,
        url: "https://api.example.com/users",
      },
      {
        alias: "req2",
        completedAt: generatedAt,
        error: null,
        method: "GET" as const,
        postRequestPassed: true,
        preRequestPassed: true,
        reducedResponse: {
          headers: {},
          latencyMs: latencyByStepId["step-2"],
          sizeBytes: 128,
          status: 200,
          statusText: "OK",
          summary: { ok: true },
        },
        resolvedRequestSummary: {
          bodyPreview: null,
          headers: {},
          url: "https://api.example.com/profile",
        },
        status: "success" as const,
        stepId: "step-2",
        stepName: "Fetch profile",
        testsPassed: true,
        url: "https://api.example.com/profile",
      },
    ],
    warnings: [],
  };
}
