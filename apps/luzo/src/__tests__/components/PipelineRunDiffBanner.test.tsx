import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PipelineRunDiffBanner } from "@/features/pipelines/components/debugger/PipelineRunDiffBanner";
import { usePipelineArtifactsStore } from "@/stores/usePipelineArtifactsStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { render } from "@/utils/test-utils";

describe("PipelineRunDiffBanner", () => {
  beforeEach(() => {
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
          steps: [],
          updatedAt: "",
        },
      ],
      selectedNodeIds: {},
    });
    usePipelineArtifactsStore.setState({
      baselineByPipelineId: {},
      debuggerByPipelineId: {},
      executionByPipelineId: {
        "pipeline-1": makeArtifact("2026-04-15T01:00:00.000Z", 500),
      },
      reportsByPipelineId: {},
    });
  });

  it("offers baseline controls when no baseline exists", () => {
    render(<PipelineRunDiffBanner status="completed" />);

    expect(screen.getByRole("button", { name: /pin current run/i })).toBeInTheDocument();
    expect(screen.getByText(/pin a known-good execution/i)).toBeInTheDocument();
  });

  it("shows diff summary after a baseline is pinned", async () => {
    usePipelineArtifactsStore.getState().saveBaselineArtifact("pipeline-1", {
      artifact: makeArtifact("2026-04-14T01:00:00.000Z", 200),
      note: null,
      pinnedAt: "2026-04-14T01:30:00.000Z",
      sourceGeneratedAt: "2026-04-14T01:00:00.000Z",
    });

    render(<PipelineRunDiffBanner status="completed" />);

    expect(screen.getByText(/detected against the pinned baseline/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /replace baseline/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear baseline/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /clear baseline/i }));
    expect(usePipelineArtifactsStore.getState().getBaselineArtifact("pipeline-1")).toBeNull();
  });
});

function makeArtifact(generatedAt: string, latencyMs: number) {
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
          latencyMs,
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
    ],
    warnings: [],
  };
}
