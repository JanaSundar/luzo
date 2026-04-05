import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DebugControlsBar } from "@/components/pipelines/DebugControlsBar";
import { render } from "@/utils/test-utils";

function renderBar(status: "paused" | "running") {
  render(
    <DebugControlsBar
      status={status}
      currentStepIndex={0}
      totalSteps={3}
      totalTime={0}
      runningCount={1}
      completedCount={0}
      isDone={false}
      onStep={vi.fn()}
      onResume={vi.fn()}
      onRetry={vi.fn()}
      onStop={vi.fn()}
      onRunAuto={vi.fn()}
    />,
  );
}

describe("DebugControlsBar", () => {
  it("keeps step controls visible while running and disables only step actions", () => {
    renderBar("running");

    expect(screen.getByRole("button", { name: /step/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /retry/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /stop/i })).toBeEnabled();
  });

  it("keeps debug controls enabled while paused", () => {
    renderBar("paused");

    expect(screen.getByRole("button", { name: /step/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /retry/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /stop/i })).toBeEnabled();
  });
});
