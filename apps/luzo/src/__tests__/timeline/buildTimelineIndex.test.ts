import { describe, expect, it } from "vitest";
import { buildTimelineIndex } from "@/features/timeline/buildTimelineIndex";
import { filterTimeline } from "@/features/timeline/filterTimeline";
import type { TimelineEvent } from "@/types/timeline-event";

const events: TimelineEvent[] = [
  {
    eventId: "1",
    executionId: "exec-1",
    stepId: "req-a",
    stepName: "A",
    stageIndex: 0,
    branchId: null,
    status: "completed",
    method: "GET",
    url: "https://example.com/a",
    timestamp: 10,
    startedAt: 10,
    endedAt: 20,
    durationMs: 10,
    sequenceNumber: 0,
    retryCount: 0,
    inputSnapshot: null,
    outputSnapshot: null,
    errorSnapshot: null,
    httpStatus: 200,
    responseSize: 10,
    isMock: false,
    preRequestPassed: null,
    testsPassed: null,
  },
  {
    eventId: "2",
    executionId: "exec-1",
    stepId: "req-b",
    stepName: "B",
    stageIndex: 1,
    branchId: "branch-1",
    status: "failed",
    method: "POST",
    url: "https://example.com/b",
    timestamp: 25,
    startedAt: 25,
    endedAt: 30,
    durationMs: 5,
    sequenceNumber: 1,
    retryCount: 1,
    inputSnapshot: null,
    outputSnapshot: null,
    errorSnapshot: null,
    httpStatus: 500,
    responseSize: 10,
    isMock: false,
    preRequestPassed: null,
    testsPassed: null,
  },
];

describe("timeline indexing", () => {
  it("indexes and filters timeline events", () => {
    const index = buildTimelineIndex({ executionId: "exec-1", events });

    expect(index.orderedEventIds).toEqual(["1", "2"]);

    const filtered = filterTimeline({
      index,
      statuses: ["failed"],
      branchIds: ["branch-1"],
    });

    expect(filtered.eventIds).toEqual(["2"]);
    expect(filtered.events[0]?.stepId).toBe("req-b");
  });
});
