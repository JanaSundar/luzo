import { describe, expect, it } from "vitest";
import {
  snapshotToTimelineEvent,
  snapshotsToTimelineEvents,
  mapStepStatus,
} from "@/features/pipeline/timeline/event-adapter";
import {
  formatBytes,
  formatDuration,
  formatTimestamp,
  computeDuration,
} from "@/features/pipeline/timeline/format-utils";
import {
  derivePanelState,
  selectSortedEvents,
  selectGroupedByStage,
  selectSelectedEvent,
  selectActiveEvent,
  selectTimelineStats,
} from "@/features/pipeline/timeline/timeline-selectors";
import type { StepSnapshot } from "@/types/pipeline-runtime";
import type { TimelineEvent } from "@/types/timeline-event";

// ─── Helpers ────────────────────────────────────────────────────────

function makeSnapshot(overrides: Partial<StepSnapshot> = {}): StepSnapshot {
  return {
    stepId: "step-1",
    stepIndex: 0,
    stepName: "Test Step",
    entryType: "request",
    method: "GET",
    url: "https://api.example.com",
    resolvedRequest: {
      method: "GET",
      url: "https://api.example.com",
      headers: { "content-type": "application/json" },
      body: null,
    },
    status: "success",
    reducedResponse: {
      status: 200,
      statusText: "OK",
      latencyMs: 150,
      sizeBytes: 1024,
      summary: {},
      headers: { "content-type": "application/json" },
    },
    fullBody: '{"result": true}',
    variables: {},
    error: null,
    startedAt: 1000,
    completedAt: 1150,
    streamStatus: "idle",
    streamChunks: [],
    ...overrides,
  };
}

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
    url: "https://api.example.com",
    timestamp: 1000,
    startedAt: 1000,
    endedAt: 1150,
    durationMs: 150,
    sequenceNumber: 0,
    retryCount: 0,
    inputSnapshot: { method: "GET", url: "https://api.example.com", headers: {}, body: null },
    outputSnapshot: {
      status: 200,
      statusText: "OK",
      headers: {},
      body: null,
      latencyMs: 150,
      sizeBytes: 1024,
    },
    errorSnapshot: null,
    httpStatus: 200,
    responseSize: 1024,
    isMock: false,
    preRequestPassed: null,
    testsPassed: null,
    ...overrides,
  };
}

function makeStoreState(events: TimelineEvent[], selectedId: string | null = null) {
  const eventById = new Map(events.map((e) => [e.eventId, e]));
  const orderedIds = events.map((e) => e.eventId);
  return { eventById, orderedIds, selectedEventId: selectedId };
}

// ─── event-adapter tests ────────────────────────────────────────────

describe("event-adapter", () => {
  describe("mapStepStatus", () => {
    it("maps step statuses to timeline statuses", () => {
      expect(mapStepStatus("idle")).toBe("queued");
      expect(mapStepStatus("step_ready")).toBe("ready");
      expect(mapStepStatus("running")).toBe("running");
      expect(mapStepStatus("success")).toBe("completed");
      expect(mapStepStatus("error")).toBe("failed");
      expect(mapStepStatus("done")).toBe("completed");
    });
  });

  describe("snapshotToTimelineEvent", () => {
    it("converts a successful snapshot", () => {
      const snapshot = makeSnapshot();
      const event = snapshotToTimelineEvent(snapshot, "exec-1");
      expect(event).not.toBeNull();
      if (!event) throw new Error("expected timeline event");

      expect(event.eventId).toBe("exec-1:step-1");
      expect(event.status).toBe("completed");
      expect(event.httpStatus).toBe(200);
      expect(event.durationMs).toBe(150);
      expect(event.inputSnapshot?.method).toBe("GET");
      expect(event.outputSnapshot?.status).toBe(200);
      expect(event.errorSnapshot).toBeNull();
      expect(event.isMock).toBe(false);
    });

    it("converts a failed snapshot", () => {
      const snapshot = makeSnapshot({ status: "error", error: "Connection refused" });
      const event = snapshotToTimelineEvent(snapshot, "exec-1");
      expect(event).not.toBeNull();
      if (!event) throw new Error("expected timeline event");

      expect(event.status).toBe("failed");
      expect(event.errorSnapshot?.message).toBe("Connection refused");
    });

    it("marks mocked responses from x-luzo-mock header", () => {
      const snapshot = makeSnapshot({
        fullHeaders: { "x-luzo-mock": "true" },
      });
      const event = snapshotToTimelineEvent(snapshot, "exec-1");
      expect(event).not.toBeNull();
      if (!event) throw new Error("expected timeline event");

      expect(event.isMock).toBe(true);
    });

    it("derives sequenceNumber from layout depth", () => {
      const snapshot = makeSnapshot({ stepIndex: 2 });
      const layout = {
        depth: 1,
        groupLabel: "Stage 2",
        mode: "sequential" as const,
        parallelGroup: false,
        detail: "",
      };
      const event = snapshotToTimelineEvent(snapshot, "exec-1", layout);
      expect(event).not.toBeNull();
      if (!event) throw new Error("expected timeline event");

      // sequenceNumber = stageIndex(1) * 1000 + stepIndex(2) = 1002
      expect(event.sequenceNumber).toBe(1002);
      expect(event.stageIndex).toBe(1);
    });

    it("sets branchId for parallel groups", () => {
      const snapshot = makeSnapshot();
      const layout = {
        depth: 0,
        groupLabel: "Parallel group 1",
        mode: "parallel" as const,
        parallelGroup: true,
        detail: "",
      };
      const event = snapshotToTimelineEvent(snapshot, "exec-1", layout);
      expect(event).not.toBeNull();
      if (!event) throw new Error("expected timeline event");

      expect(event.branchId).toBe("stage-0");
    });

    it("maps condition snapshots to a single condition event", () => {
      const snapshot = makeSnapshot({
        entryType: "condition",
        status: "done",
        conditionResult: {
          result: true,
          resolvedInputs: { "req1.response.status": 200 },
        },
      });
      const event = snapshotToTimelineEvent(snapshot, "exec-1");
      expect(event).not.toBeNull();
      if (!event) throw new Error("expected timeline event");

      expect(event.eventKind).toBe("condition_evaluated");
      expect(event.routeSemantics).toBe("true");
      expect(event.outcome).toBe("selected");
      expect(event.terminalReason).toBe("Condition resolved true");
    });

    it("ignores unresolved condition snapshots", () => {
      const snapshot = makeSnapshot({
        entryType: "condition",
        stepId: "cond-1",
        stepName: "Status gate",
        status: "running",
        reducedResponse: null,
        completedAt: null,
      });

      expect(snapshotToTimelineEvent(snapshot, "exec-1")).toBeNull();
    });
  });

  describe("snapshotsToTimelineEvents", () => {
    it("batch-converts snapshots — O(n)", () => {
      const snapshots = [
        makeSnapshot({ stepId: "s1", stepIndex: 0, stepName: "Step 1" }),
        makeSnapshot({ stepId: "s2", stepIndex: 1, stepName: "Step 2" }),
      ];
      const events = snapshotsToTimelineEvents(snapshots, "exec-1", new Map());

      expect(events).toHaveLength(2);
      expect(events[0].stepId).toBe("s1");
      expect(events[1].stepId).toBe("s2");
    });

    it("does not duplicate the condition node row", () => {
      const snapshot = makeSnapshot({
        stepId: "cond-1",
        stepName: "Status gate",
        entryType: "condition",
        status: "done",
        conditionResult: {
          result: true,
          resolvedInputs: { "req1.response.status": 200 },
        },
      });
      const events = snapshotsToTimelineEvents(
        [snapshot],
        "exec-1",
        new Map([
          [
            "cond-1",
            {
              depth: 0,
              groupLabel: "Stage 1",
              mode: "sequential" as const,
              parallelGroup: false,
              detail: "",
            },
          ],
        ]),
        [
          {
            nodeId: "cond-1",
            kind: "condition",
            orderIndex: 0,
            stageIndex: 0,
            dependencyIds: [],
            activationIds: [],
            downstreamIds: ["step-true", "step-false"],
            entry: true,
            conditionConfig: {
              kind: "condition",
              label: "Status gate",
              rules: [],
              expression: "",
            },
            routes: {
              control: [],
              success: [],
              failure: [],
              true: ["step-true"],
              false: ["step-false"],
            },
            runtimeRoutes: [],
            branch: { mode: "all" },
          },
          {
            nodeId: "step-true",
            kind: "request",
            orderIndex: 1,
            stageIndex: 1,
            dependencyIds: ["cond-1"],
            activationIds: ["cond-1"],
            downstreamIds: [],
            entry: false,
            routes: { control: [], success: [], failure: [], true: [], false: [] },
            runtimeRoutes: [],
          },
          {
            nodeId: "step-false",
            kind: "request",
            orderIndex: 2,
            stageIndex: 1,
            dependencyIds: ["cond-1"],
            activationIds: ["cond-1"],
            downstreamIds: [],
            entry: false,
            routes: { control: [], success: [], failure: [], true: [], false: [] },
            runtimeRoutes: [],
          },
        ],
        new Map([
          ["cond-1", "Status gate"],
          ["step-true", "Approved path"],
          ["step-false", "Rejected path"],
        ]),
      );

      expect(events.filter((event) => event.stepId === "cond-1")).toHaveLength(1);
      expect(events[0]?.eventKind).toBe("condition_evaluated");
      expect(events.some((event) => event.eventKind === "step_skipped")).toBe(true);
      expect(events.find((event) => event.eventKind === "step_skipped")?.stepName).toBe(
        "Rejected path",
      );
    });

    it("skips unresolved condition snapshots during batch sync", () => {
      const events = snapshotsToTimelineEvents(
        [
          makeSnapshot({
            stepId: "cond-1",
            stepName: "Status gate",
            entryType: "condition",
            status: "running",
            reducedResponse: null,
            completedAt: null,
          }),
        ],
        "exec-1",
        new Map(),
      );

      expect(events).toHaveLength(0);
    });
  });
});

// ─── format-utils tests ─────────────────────────────────────────────

describe("format-utils", () => {
  describe("formatDuration", () => {
    it("formats null as dash", () => expect(formatDuration(null)).toBe("—"));
    it("formats 0ms", () => expect(formatDuration(0)).toBe("0ms"));
    it("formats milliseconds", () => expect(formatDuration(150)).toBe("150ms"));
    it("formats seconds", () => expect(formatDuration(2500)).toBe("2.5s"));
    it("formats minutes", () => expect(formatDuration(90_000)).toBe("1m 30s"));
  });

  describe("formatBytes", () => {
    it("formats null as dash", () => expect(formatBytes(null)).toBe("—"));
    it("formats small bytes", () => expect(formatBytes(512)).toBe("512b"));
    it("formats kilobytes", () => expect(formatBytes(2048)).toBe("2.0kb"));
    it("formats megabytes", () => expect(formatBytes(1_500_000)).toBe("1.4mb"));
  });

  describe("formatTimestamp", () => {
    it("formats null as dash", () => expect(formatTimestamp(null)).toBe("—"));
    it("produces HH:MM:SS.mmm format", () => {
      const result = formatTimestamp(1000);
      // Should match pattern HH:MM:SS.mmm regardless of timezone
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
    });
  });

  describe("computeDuration", () => {
    it("returns null if startedAt is null", () => expect(computeDuration(null, 100)).toBeNull());
    it("returns null if endedAt is null", () => expect(computeDuration(100, null)).toBeNull());
    it("computes positive duration", () => expect(computeDuration(100, 250)).toBe(150));
    it("clamps negative duration to 0", () => expect(computeDuration(200, 100)).toBe(0));
  });
});

// ─── timeline-selectors tests ───────────────────────────────────────

describe("timeline-selectors", () => {
  describe("selectSortedEvents", () => {
    it("sorts by sequenceNumber (primary) then stepId (tiebreaker)", () => {
      const events = [
        makeEvent({ eventId: "e2", stepId: "b", sequenceNumber: 1 }),
        makeEvent({ eventId: "e1", stepId: "a", sequenceNumber: 0 }),
        makeEvent({ eventId: "e3", stepId: "c", sequenceNumber: 1 }),
      ];
      const state = makeStoreState(events);
      const sorted = selectSortedEvents(state);

      expect(sorted.map((e) => e.eventId)).toEqual(["e1", "e2", "e3"]);
    });
  });

  describe("selectGroupedByStage", () => {
    it("groups events by stageIndex", () => {
      const events = [
        makeEvent({ eventId: "e1", stageIndex: 0, branchId: null }),
        makeEvent({ eventId: "e2", stageIndex: 1, branchId: "stage-1" }),
        makeEvent({ eventId: "e3", stageIndex: 1, branchId: "stage-1" }),
      ];
      const state = makeStoreState(events);
      const groups = selectGroupedByStage(state);

      expect(groups).toHaveLength(2);
      expect(groups[0].stageIndex).toBe(0);
      expect(groups[0].isParallel).toBe(false);
      expect(groups[0].eventIds).toHaveLength(1);
      expect(groups[1].stageIndex).toBe(1);
      expect(groups[1].isParallel).toBe(true);
      expect(groups[1].eventIds).toHaveLength(2);
    });
  });

  describe("selectSelectedEvent", () => {
    it("returns null when nothing selected", () => {
      const state = makeStoreState([makeEvent()]);
      expect(selectSelectedEvent(state)).toBeNull();
    });

    it("returns the selected event — O(1) lookup", () => {
      const event = makeEvent();
      const state = makeStoreState([event], event.eventId);
      expect(selectSelectedEvent(state)?.eventId).toBe(event.eventId);
    });
  });

  describe("selectActiveEvent", () => {
    it("returns null when no running events", () => {
      const state = makeStoreState([makeEvent({ status: "completed" })]);
      expect(selectActiveEvent(state)).toBeNull();
    });

    it("returns the running event", () => {
      const events = [
        makeEvent({ eventId: "e1", status: "completed" }),
        makeEvent({ eventId: "e2", status: "running" }),
      ];
      const state = makeStoreState(events);
      expect(selectActiveEvent(state)?.eventId).toBe("e2");
    });
  });

  describe("selectTimelineStats", () => {
    it("computes stats in single pass — O(n)", () => {
      const events = [
        makeEvent({ eventId: "e1", status: "completed", durationMs: 100 }),
        makeEvent({ eventId: "e2", status: "running", durationMs: null }),
        makeEvent({ eventId: "e3", status: "failed", durationMs: 50 }),
      ];
      const state = makeStoreState(events);
      const stats = selectTimelineStats(state);

      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.running).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.totalDurationMs).toBe(150);
    });
  });

  describe("derivePanelState", () => {
    it("returns 'empty' for idle with no events", () => {
      expect(derivePanelState("idle", 0)).toBe("empty");
    });
    it("returns 'loading' for running with no events", () => {
      expect(derivePanelState("running", 0)).toBe("loading");
    });
    it("returns 'live' for running with events", () => {
      expect(derivePanelState("running", 3)).toBe("live");
    });
    it("returns 'live' for paused with events", () => {
      expect(derivePanelState("paused", 3)).toBe("live");
    });
    it("returns 'error' for error status", () => {
      expect(derivePanelState("error", 3)).toBe("error");
    });
    it("returns 'done' for completed", () => {
      expect(derivePanelState("completed", 3)).toBe("done");
    });
  });
});
