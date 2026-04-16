import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FlowNodeMenu } from "@/features/flow-editor/FlowEditorPage";
import { createLuzoBlockRegistry } from "@/features/flow-editor/blockDefs";
import { StepCardMenu } from "@/features/pipelines/components/StepCardMenu";
import { render } from "@/utils/test-utils";

describe("Start Here entrypoints", () => {
  it("renders Start Here actions in the builder step menu", async () => {
    render(
      <StepCardMenu
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        onRunFromHere={vi.fn()}
        onRunFromHereFresh={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button"));

    expect(await screen.findByRole("menuitem", { name: /start here/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /run fresh/i })).toBeInTheDocument();
  });

  it("renders Start Here actions in the flow editor request-node menu", () => {
    render(
      <FlowNodeMenu
        close={vi.fn()}
        node={{ id: "step-2", type: "request" } as never}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        onRunFresh={vi.fn()}
        onStartHere={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /start here/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run fresh/i })).toBeInTheDocument();
  });

  it("renders a visible request-node actions menu in the flow editor card", async () => {
    const onStartHere = vi.fn();
    const onRunFresh = vi.fn();
    const registry = createLuzoBlockRegistry(new Map(), { onRunFresh, onStartHere });
    const requestCard = registry.request?.renderCard;

    render(
      <>
        {requestCard?.(
          {
            id: "req-2",
            type: "request",
            position: { x: 0, y: 0 },
            data: {
              label: "Get user",
              method: "GET",
              url: "https://api.example.com/users/2",
              executionState: "idle",
            },
          } as never,
          { onUpdate: vi.fn(), readOnly: false, selected: false },
        )}
      </>,
    );

    await userEvent.click(screen.getByRole("button", { name: /request actions for get user/i }));

    expect(await screen.findByRole("menuitem", { name: /start here/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /run fresh/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("menuitem", { name: /start here/i }));
    expect(onStartHere).toHaveBeenCalledWith("req-2");
  });
});
