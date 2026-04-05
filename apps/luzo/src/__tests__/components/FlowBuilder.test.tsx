import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { createBlockRegistry, FlowBuilder } from "@luzo/flow-builder";
import type { EdgeChange, FlowEdge, FlowNode, NodeChange } from "@luzo/flow-types";

import { FlowEditorPage } from "@/features/flow-editor/FlowEditorPage";
import { createPipelineRecord } from "@/lib/pipeline/createPipelineRecord";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { render } from "@/test/utils";

describe("FlowBuilder", () => {
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

  it("keeps request cards compact on the canvas and opens the docked inspector on selection", () => {
    render(<FlowBuilderHarness />);

    expect(screen.getByTestId("flow-builder-canvas")).toHaveStyle({
      height: "100%",
      width: "100%",
    });
    expect(screen.getByText("https://api.example.com/orders")).toBeInTheDocument();
    expect(screen.getByText("https://api.example.com/orders")).toHaveStyle({
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
    expect(screen.queryByLabelText("Request URL")).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();

    fireEvent.pointerDown(screen.getByLabelText("request node"), {
      button: 0,
      clientX: 120,
      clientY: 120,
    });
    fireEvent.pointerUp(window, { clientX: 120, clientY: 120 });

    expect(screen.getByRole("complementary", { name: "request inspector" })).toBeInTheDocument();
    expect(screen.getByTestId("flow-builder-inspector-body")).toHaveStyle({
      overflow: "auto",
      overflowX: "hidden",
    });
    expect(screen.getByLabelText("Request URL")).toBeInTheDocument();
  });

  it("swaps and closes the docked inspector based on selection", () => {
    render(<FlowBuilderHarness />);

    fireEvent.pointerDown(screen.getByLabelText("request node"), {
      button: 0,
      clientX: 120,
      clientY: 120,
    });
    fireEvent.pointerUp(window, { clientX: 120, clientY: 120 });
    expect(screen.getByLabelText("Request URL")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByLabelText("evaluate node"), {
      button: 0,
      clientX: 320,
      clientY: 180,
    });
    fireEvent.pointerUp(window, { clientX: 320, clientY: 180 });
    expect(screen.queryByLabelText("Request URL")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Expression")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId("flow-builder-canvas"), {
      button: 0,
      clientX: 12,
      clientY: 12,
    });
    fireEvent.pointerUp(screen.getByTestId("flow-builder-canvas"), {
      clientX: 12,
      clientY: 12,
    });
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("does not open the block editor when dragging a node", () => {
    render(<FlowBuilderHarness />);

    fireEvent.pointerDown(screen.getByLabelText("request node"), {
      button: 0,
      clientX: 120,
      clientY: 120,
    });
    fireEvent.pointerMove(window, {
      clientX: 220,
      clientY: 210,
    });
    fireEvent.pointerUp(window, {
      clientX: 220,
      clientY: 210,
    });

    expect(
      screen.queryByRole("complementary", { name: "request inspector" }),
    ).not.toBeInTheDocument();
  });

  it("resolves node collisions after dragging a card onto another card", async () => {
    render(<FlowBuilderHarness />);

    const requestNode = screen.getByLabelText("request node");
    const evaluateNode = screen.getByLabelText("evaluate node");

    fireEvent.pointerDown(requestNode, {
      button: 0,
      clientX: 120,
      clientY: 120,
    });
    fireEvent.pointerMove(window, {
      clientX: 460,
      clientY: 200,
    });
    fireEvent.pointerUp(window, {
      clientX: 460,
      clientY: 200,
    });

    await waitFor(() => {
      expect(parseFloat(requestNode.style.left)).toBe(420);
      expect(parseFloat(requestNode.style.top)).toBe(160);
      expect(
        parseFloat(evaluateNode.style.left) !== 420 || parseFloat(evaluateNode.style.top) !== 160,
      ).toBe(true);
    });
  });

  it("shows compact node context menu actions and duplicates nodes when requested", async () => {
    render(<FlowBuilderHarness />);

    fireEvent.contextMenu(screen.getByLabelText("request node"), {
      clientX: 120,
      clientY: 120,
    });

    const copyButton = screen.getByRole("button", { name: "Copy node id" });
    expect(screen.queryByRole("button", { name: "Select request" })).not.toBeInTheDocument();
    const duplicateButton = screen.getByRole("button", { name: "Duplicate request" });
    expect(copyButton).toBeInTheDocument();
    expect(duplicateButton).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete request" })).toBeInTheDocument();
    expect(copyButton).toHaveStyle({ fontSize: "12px" });

    fireEvent.click(duplicateButton);

    await waitFor(() => {
      expect(screen.getByText("Orders (Copy)")).toBeInTheDocument();
    });
  });

  it("keeps the block editor closed after dragging a previously selected node", () => {
    render(<FlowBuilderHarness />);

    fireEvent.pointerDown(screen.getByLabelText("request node"), {
      button: 0,
      clientX: 120,
      clientY: 120,
    });
    fireEvent.pointerUp(window, { clientX: 120, clientY: 120 });
    expect(screen.getByRole("complementary", { name: "request inspector" })).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByLabelText("request node"), {
      button: 0,
      clientX: 120,
      clientY: 120,
    });
    fireEvent.pointerMove(window, {
      clientX: 250,
      clientY: 220,
    });
    fireEvent.pointerUp(window, {
      clientX: 250,
      clientY: 220,
    });

    expect(
      screen.queryByRole("complementary", { name: "request inspector" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the edge layer aligned with pan transforms", () => {
    render(<FlowBuilderHarness />);

    const canvas = screen.getByTestId("flow-builder-canvas");
    const edgeLayer = screen.getByTestId("flow-builder-edge-layer");
    const mainPath = edgeLayer.querySelector("[data-edge-role='main']");

    expect(mainPath).not.toBeNull();
    expect(mainPath).toHaveAttribute("d", expect.stringContaining("M 340 140"));
    expect(mainPath).toHaveAttribute("stroke-dasharray", "var(--fb-edge-dash-pattern, 1 8)");
    expect(edgeLayer).toHaveStyle({
      transform: "translate(0px, 0px) scale(1)",
    });

    fireEvent.wheel(canvas, {
      clientX: 140,
      clientY: 160,
      deltaX: 24,
      deltaY: 36,
    });

    expect(edgeLayer).toHaveStyle({
      transform: "translate(-24px, -36px) scale(1)",
    });
  });

  it("lets the bottom bar fit-view control reset the viewport", async () => {
    render(<FlowBuilderHarness />);

    const canvas = screen.getByTestId("flow-builder-canvas");
    const edgeLayer = screen.getByTestId("flow-builder-edge-layer");

    fireEvent.wheel(canvas, {
      clientX: 140,
      clientY: 160,
      deltaX: 24,
      deltaY: 36,
    });
    expect(edgeLayer).toHaveStyle({
      transform: "translate(-24px, -36px) scale(1)",
    });

    fireEvent.click(screen.getByTestId("flow-builder-fit-view"));

    await waitFor(() => {
      expect(edgeLayer).toHaveStyle({
        transform: "translate(-76px, -42px) scale(0.2)",
      });
    });
  });

  it("uses handle-specific custom connection previews for success and fail handles", () => {
    render(<FlowBuilderHarness />);

    fireEvent.pointerDown(screen.getByLabelText("request node"), {
      button: 0,
      clientX: 120,
      clientY: 120,
    });
    fireEvent.pointerUp(window, { clientX: 120, clientY: 120 });
    expect(screen.getByRole("complementary", { name: "request inspector" })).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByLabelText("Connect source Success"), {
      button: 0,
      clientX: 340,
      clientY: 150,
    });

    expect(
      screen.queryByRole("complementary", { name: "request inspector" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("flow-builder-connection-preview-line")).toHaveAttribute(
      "stroke",
      "var(--fb-edge-success-stroke, #16a34a)",
    );
    expect(screen.getByTestId("flow-builder-connection-preview-line")).toHaveAttribute(
      "marker-end",
      "url(#flow-builder-edge-arrow-success)",
    );
    expect(screen.getByTestId("flow-builder-connection-preview-line")).toHaveAttribute(
      "d",
      expect.stringContaining("M 340 140"),
    );
    expect(screen.getByTestId("flow-builder-connection-preview-line")).toHaveAttribute(
      "stroke-dasharray",
      "var(--fb-edge-dash-pattern, 1 8)",
    );

    fireEvent.pointerUp(window, { clientX: 20, clientY: 20 });

    fireEvent.pointerDown(screen.getByLabelText("Connect source Fail"), {
      button: 0,
      clientX: 340,
      clientY: 190,
    });

    expect(screen.getByTestId("flow-builder-connection-preview-line")).toHaveAttribute(
      "stroke",
      "var(--fb-edge-fail-stroke, #dc2626)",
    );
    expect(screen.getByTestId("flow-builder-connection-preview-line")).toHaveAttribute(
      "marker-end",
      "url(#flow-builder-edge-arrow-fail)",
    );
    expect(screen.getByTestId("flow-builder-connection-preview-line")).toHaveAttribute(
      "d",
      expect.stringContaining("M 340 200"),
    );
    expect(screen.getByTestId("flow-builder-connection-preview-line")).toHaveAttribute(
      "stroke-dasharray",
      "var(--fb-edge-dash-pattern, 1 8)",
    );
  });

  it("renders committed connections through the pipeline store path", async () => {
    const pipeline = createPipelineRecord("Canvas test");
    pipeline.flow = {
      version: 1,
      blocks: [
        { id: "flow-start", type: "start", position: { x: 64, y: 200 }, data: { label: "Start" } },
        {
          id: "request-1",
          type: "request",
          position: { x: 280, y: 160 },
          data: {
            auth: { type: "none" },
            body: null,
            bodyType: "none",
            headers: [],
            method: "GET",
            name: "Orders",
            params: [],
            url: "https://api.example.com/orders",
          },
        },
        {
          id: "evaluate-1",
          type: "evaluate",
          position: { x: 660, y: 160 },
          data: { conditionType: "if", expression: "status === 200", label: "Check response" },
        },
      ],
      connections: [
        {
          id: "edge-start-request",
          kind: "control",
          sourceBlockId: "flow-start",
          sourceHandleId: "output",
          targetBlockId: "request-1",
          targetHandleId: "input",
        },
      ],
      viewport: { x: 0, y: 0, scale: 1 },
    };
    pipeline.steps = [
      {
        auth: { type: "none" },
        body: null,
        bodyType: "none",
        headers: [],
        id: "request-1",
        method: "GET",
        name: "Orders",
        params: [],
        upstreamStepIds: [],
        url: "https://api.example.com/orders",
      },
    ];

    usePipelineStore.setState({
      activePipelineId: pipeline.id,
      pipelines: [pipeline],
    });

    render(
      <div style={{ height: 760, width: 1280 }}>
        <FlowEditorPage />
      </div>,
    );

    const sourceHandle = screen.getByLabelText("Connect source Success");
    const targetNode = screen.getByLabelText("evaluate node");
    const targetHandle = targetNode.querySelector(
      "[data-flow-handle='true'][data-handle-id='input']",
    );

    expect(targetHandle).not.toBeNull();

    fireEvent.pointerDown(sourceHandle, {
      button: 0,
      clientX: 420,
      clientY: 220,
    });
    fireEvent.pointerUp(targetHandle!, {
      clientX: 660,
      clientY: 220,
    });

    await waitFor(() => {
      expect(usePipelineStore.getState().pipelines[0]?.flow.connections).toHaveLength(2);
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("flow-builder-edge-layer").querySelectorAll("[data-edge-role='main']")
          .length,
      ).toBeGreaterThanOrEqual(2);
    });
  });

  it("duplicates flow-editor request blocks from the node context menu", async () => {
    const pipeline = createPipelineRecord("Duplicate node test");
    pipeline.flow = {
      version: 1,
      blocks: [
        { id: "flow-start", type: "start", position: { x: 64, y: 200 }, data: { label: "Start" } },
        {
          id: "request-1",
          type: "request",
          position: { x: 280, y: 160 },
          data: {
            auth: { type: "none" },
            body: null,
            bodyType: "none",
            headers: [],
            method: "GET",
            name: "Orders",
            params: [],
            url: "https://api.example.com/orders",
          },
        },
      ],
      connections: [],
      viewport: { x: 0, y: 0, scale: 1 },
    };
    pipeline.steps = [
      {
        auth: { type: "none" },
        body: null,
        bodyType: "none",
        headers: [],
        id: "request-1",
        method: "GET",
        name: "Orders",
        params: [],
        upstreamStepIds: [],
        url: "https://api.example.com/orders",
      },
    ];

    usePipelineStore.setState({
      activePipelineId: pipeline.id,
      pipelines: [pipeline],
    });

    render(
      <div style={{ height: 760, width: 1280 }}>
        <FlowEditorPage />
      </div>,
    );

    fireEvent.contextMenu(screen.getByLabelText("request node"), {
      clientX: 320,
      clientY: 220,
    });
    fireEvent.click(screen.getByRole("button", { name: "Duplicate request" }));

    await waitFor(() => {
      const storedBlocks = usePipelineStore.getState().pipelines[0]?.flow.blocks ?? [];
      const requestBlocks = storedBlocks.filter((block) => block.type === "request");

      expect(requestBlocks).toHaveLength(2);
      expect(requestBlocks.some((block) => block.id !== "request-1")).toBe(true);
      expect(
        requestBlocks.some(
          (block) => block.type === "request" && block.data.name === "Orders (Copy)",
        ),
      ).toBe(true);
    });
  });
});

function FlowBuilderHarness() {
  const [nodes, setNodes] = useState<FlowNode[]>([
    {
      id: "request-1",
      type: "request",
      position: { x: 80, y: 80 },
      data: {
        requestId: "request-1",
        label: "Orders",
        method: "GET",
        url: "https://api.example.com/orders",
        paramCount: 2,
        headerCount: 1,
        bodyType: "none",
        authType: "none",
      },
    },
    {
      id: "evaluate-1",
      type: "evaluate",
      position: { x: 420, y: 160 },
      data: { label: "Check response", conditionType: "if", expression: "status === 200" },
    },
  ]);
  const [edges, setEdges] = useState<FlowEdge[]>([
    {
      id: "edge-1",
      source: "request-1",
      sourceHandle: "success",
      target: "evaluate-1",
      targetHandle: "input",
      type: "default",
    },
  ]);

  return (
    <div style={{ height: 680, width: 1200 }}>
      <FlowBuilder
        blockRegistry={mockRegistry}
        edges={edges}
        nodes={nodes}
        onConnect={() => {}}
        onDuplicateNode={(nodeId) =>
          setNodes((current) => {
            const node = current.find((entry) => entry.id === nodeId);
            if (!node) return current;

            const duplicate = {
              ...node,
              id: `${node.id}-copy-${current.length}`,
              position: { x: node.position.x + 48, y: node.position.y + 48 },
              data: structuredClone(node.data) as FlowNode["data"],
            };

            if (typeof (duplicate.data as { label?: string }).label === "string") {
              duplicate.data = {
                ...(duplicate.data as Record<string, unknown>),
                label: `${(duplicate.data as { label: string }).label} (Copy)`,
              };
            }

            return [...current, duplicate];
          })
        }
        onEdgesChange={(changes) => setEdges((current) => applyEdgeChanges(current, changes))}
        onNodesChange={(changes) => setNodes((current) => applyNodeChanges(current, changes))}
      />
    </div>
  );
}

const mockRegistry = createBlockRegistry([
  {
    type: "request",
    handles: [
      { id: "input", position: "left", type: "target" },
      { id: "success", position: "right", type: "source", label: "Success" },
      { id: "fail", position: "right", type: "source", label: "Fail" },
    ],
    renderInspector: (node, api) => (
      <div data-flow-editable="true" className="grid gap-3">
        <input
          aria-label="Request URL"
          value={(node.data as { url?: string }).url ?? ""}
          onChange={(event) => api.onUpdate(node.id, { url: event.target.value })}
        />
      </div>
    ),
  },
  {
    type: "evaluate",
    handles: [
      { id: "input", position: "left", type: "target" },
      { id: "true", position: "right", type: "source", label: "True" },
      { id: "false", position: "right", type: "source", label: "False" },
    ],
    renderInspector: (node, api) => (
      <div data-flow-editable="true" className="grid gap-3">
        <textarea
          aria-label="Expression"
          value={(node.data as { expression?: string }).expression ?? ""}
          onChange={(event) => api.onUpdate(node.id, { expression: event.target.value })}
        />
      </div>
    ),
  },
]);

function applyNodeChanges(nodes: FlowNode[], changes: NodeChange[]) {
  return changes.reduce((current, change) => {
    switch (change.type) {
      case "replace":
        return current.map((node) => (node.id === change.id ? change.item : node));
      case "remove":
        return current.filter((node) => node.id !== change.id);
      case "position":
        return current.map((node) =>
          node.id === change.id ? { ...node, position: change.position } : node,
        );
      case "select":
        return current.map((node) =>
          node.id === change.id ? { ...node, selected: change.selected } : node,
        );
      case "add":
        return [...current, change.item];
      default:
        return current;
    }
  }, nodes);
}

function applyEdgeChanges(edges: FlowEdge[], changes: EdgeChange[]) {
  return changes.reduce((current, change) => {
    switch (change.type) {
      case "replace":
        return current.map((edge) => (edge.id === change.id ? change.item : edge));
      case "remove":
        return current.filter((edge) => edge.id !== change.id);
      case "select":
        return current.map((edge) =>
          edge.id === change.id ? { ...edge, selected: change.selected } : edge,
        );
      case "add":
        return [...current, change.item];
      default:
        return current;
    }
  }, edges);
}
