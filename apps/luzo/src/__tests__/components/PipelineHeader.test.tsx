import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineHeader } from "@/components/pipelines/PipelineHeader";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { render } from "@/utils/test-utils";

describe("PipelineHeader", () => {
  beforeEach(() => {
    usePipelineStore.setState({
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
      currentView: "builder",
      selectedNodeIds: {},
      executing: false,
      executionResult: null,
    });
  });

  it("removes the response stream tab and exposes builder timeline controls", () => {
    const onToggleExecutionDrawer = vi.fn();
    const onAutoOpenTimelineChange = vi.fn();

    render(
      <PipelineHeader
        activePipelineName="Pipeline 1"
        currentView="builder"
        isExecuting={false}
        activePipelineId="pipeline-1"
        onSetView={vi.fn()}
        onRun={vi.fn()}
        onDebug={vi.fn()}
        onStop={vi.fn()}
        onToggleExecutionDrawer={onToggleExecutionDrawer}
        onAutoOpenTimelineChange={onAutoOpenTimelineChange}
      />,
    );

    expect(screen.queryByRole("button", { name: /response stream/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /more actions/i }));
    expect(screen.getByRole("menuitem", { name: /show timeline/i })).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemcheckbox", { name: /auto-open timeline/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /auto-open timeline/i }));
    fireEvent.click(screen.getByRole("button", { name: /more actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /show timeline/i }));

    expect(onToggleExecutionDrawer).toHaveBeenCalledTimes(1);
    expect(onAutoOpenTimelineChange).toHaveBeenCalledWith(false);
  });
});
