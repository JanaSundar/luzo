import { describe, expect, it } from "vitest";
import {
  buildPipelineStepNameMap,
  resolveTimelineDisplayName,
} from "@/features/pipelines/components/debugger/timelineDisplayNames";
import type { Pipeline } from "@/types";

describe("timelineDisplayNames", () => {
  const pipeline = {
    id: "pipeline-1",
    name: "Pipeline",
    description: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    steps: [
      {
        id: "ba5f4424-301b-4540-8d78-65698731349a",
        name: "New Request",
        method: "GET",
        url: "https://example.com",
        headers: [],
        params: [],
        body: null,
        bodyType: "none",
        auth: { type: "none" },
        preRequestScript: "",
        postRequestScript: "",
        testScript: "",
      },
    ],
    narrativeConfig: {
      tone: "technical",
      prompt: "",
      enabled: false,
      length: "short",
      promptOverrides: {
        technical: "",
        executive: "",
        compliance: "",
      },
    },
  } satisfies Pipeline;

  it("prefers pipeline request names over identifier-like fallback values", () => {
    const stepNameById = buildPipelineStepNameMap(pipeline);

    expect(
      resolveTimelineDisplayName({
        stepId: "ba5f4424-301b-4540-8d78-65698731349a",
        fallback: "ba5f4424-301b-4540-8d78-65698731349a",
        stepNameById,
      }),
    ).toBe("New Request");
  });

  it("hides raw uuid fallbacks when there is no mapped pipeline step name", () => {
    expect(
      resolveTimelineDisplayName({
        stepId: "missing-step",
        fallback: "ba5f4424-301b-4540-8d78-65698731349a",
        stepNameById: new Map(),
      }),
    ).toBe("Unnamed step");
  });
});
