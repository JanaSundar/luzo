import { fireEvent, render, screen, waitFor } from "@/test/utils";
import { beforeEach, describe, expect, it } from "vitest";

import { FlowEditorPage } from "@/features/flow-editor/FlowEditorPage";
import type { RequestBlock } from "@/features/flow-editor/domain/types";
import { RequestInspector } from "@/features/flow-editor/inspectors/RequestInspector";
import { createPipelineRecord } from "@/lib/pipeline/createPipelineRecord";
import { createVariableSuggestion } from "@/lib/utils/variableMetadata";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import type { RequestNode } from "@luzo/flow-types";

describe("Flow editor interactions", () => {
  beforeEach(() => {
    usePipelineStore.setState({
      activePipelineId: null,
      currentView: "builder",
      executionResult: null,
      executing: false,
      expandedStepIds: {},
      pipelines: [],
    });
  });

  it("keeps the preview arrow visible while the edge-drop suggestion menu is open", async () => {
    const pipeline = createPipelineRecord("Suggestion test");

    usePipelineStore.setState({
      activePipelineId: pipeline.id,
      pipelines: [pipeline],
    });

    render(
      <div style={{ height: 760, width: 1280 }}>
        <FlowEditorPage />
      </div>,
    );

    fireEvent.pointerDown(screen.getByLabelText("Connect source output"), {
      button: 0,
      clientX: 230,
      clientY: 240,
    });
    fireEvent.pointerUp(window, { clientX: 420, clientY: 240 });

    expect(screen.getByTestId("flow-builder-connection-preview-line")).toBeInTheDocument();
    expect(screen.getByText("Request")).toBeInTheDocument();
    expect(screen.getByText("Condition")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
    expect(screen.queryByText("List")).not.toBeInTheDocument();
    expect(screen.queryByText("Display")).not.toBeInTheDocument();
    expect(screen.queryByText("Text")).not.toBeInTheDocument();
    expect(screen.queryByText("Group")).not.toBeInTheDocument();
  });

  it("keeps the suggestion menu inside the viewport", async () => {
    const pipeline = createPipelineRecord("Suggestion clamp test");
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    try {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: 280,
        writable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: 240,
        writable: true,
      });
      HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
        if (this.getAttribute("role") === "menu") {
          return {
            bottom: 360,
            height: 150,
            left: 420,
            right: 640,
            toJSON: () => ({}),
            top: 210,
            width: 200,
            x: 420,
            y: 210,
          } as DOMRect;
        }

        return originalGetBoundingClientRect.call(this);
      };

      usePipelineStore.setState({
        activePipelineId: pipeline.id,
        pipelines: [pipeline],
      });

      render(
        <div style={{ height: 760, width: 1280 }}>
          <FlowEditorPage />
        </div>,
      );

      fireEvent.pointerDown(screen.getByLabelText("Connect source output"), {
        button: 0,
        clientX: 230,
        clientY: 240,
      });
      fireEvent.pointerUp(window, { clientX: 420, clientY: 240 });

      await waitFor(() => {
        expect(screen.getByRole("menu")).toHaveStyle({
          left: "68px",
          top: "78px",
        });
      });
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: originalInnerWidth,
        writable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: originalInnerHeight,
        writable: true,
      });
    }
  });

  it("shows variable autocomplete inside the canvas request inspector", async () => {
    render(
      <RequestInspector
        api={{ onUpdate: () => {}, readOnly: false }}
        block={requestBlock}
        node={requestNode}
        suggestions={[
          createVariableSuggestion({
            path: "base_url",
            label: "env: base_url",
            resolvedValue: "https://api.example.com",
            stepId: "",
            type: "env",
          }),
        ]}
      />,
    );

    const urlInput = screen.getByLabelText("Request URL");
    fireEvent.change(urlInput, { target: { value: "{{ba", selectionStart: 4 } });

    await waitFor(() => {
      expect(screen.getByText("base_url")).toBeInTheDocument();
      expect(screen.getByText("env: base_url")).toBeInTheDocument();
    });
  });
});

const requestNode: RequestNode = {
  id: "request-1",
  type: "request",
  position: { x: 0, y: 0 },
  data: {
    authType: "none",
    bodyType: "none",
    headerCount: 0,
    label: "Orders",
    method: "GET",
    paramCount: 0,
    requestId: "request-1",
    url: "",
  },
};

const requestBlock: RequestBlock = {
  id: "request-1",
  type: "request",
  position: { x: 0, y: 0 },
  data: {
    auth: { type: "none" },
    body: null,
    bodyType: "none",
    headers: [],
    method: "GET",
    name: "Orders",
    params: [],
    url: "",
  },
};
