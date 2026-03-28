import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineHeader } from "@/components/pipelines/PipelineHeader";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { render } from "@/utils/test-utils";

describe("PipelineHeader", () => {
  beforeEach(() => {
    usePipelineStore.setState({
      pipelines: [],
      activePipelineId: null,
      currentView: "builder",
      selectedNodeIds: {},
      executing: false,
      executionResult: null,
    });
  });

  it("uses onRetry instead of onRun for the stream retry button", () => {
    const onRetry = vi.fn();
    const onRun = vi.fn();

    usePipelineStore.setState((state) => ({
      ...state,
      pipelines: [
        {
          id: "pipeline-1",
          name: "Pipeline 1",
          steps: [],
          narrativeConfig: { tone: "technical", prompt: "", enabled: true },
          createdAt: "",
          updatedAt: "",
        },
      ],
      activePipelineId: "pipeline-1",
      currentView: "stream",
    }));

    render(
      <PipelineHeader
        activePipelineName="Pipeline 1"
        currentView="stream"
        isExecuting={false}
        activePipelineId="pipeline-1"
        snapshotsCount={1}
        onSetView={vi.fn()}
        onRun={onRun}
        onDebug={vi.fn()}
        onStop={vi.fn()}
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRun).not.toHaveBeenCalled();
  });
});
