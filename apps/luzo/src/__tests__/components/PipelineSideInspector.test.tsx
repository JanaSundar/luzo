import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PipelineSideInspector } from "@/features/pipelines/components/PipelineSideInspector";
import { render } from "@/utils/test-utils";

const pipelineStoreState = {
  pipelines: [
    {
      id: "pipeline-1",
      name: "Checkout Flow",
      steps: [
        {
          id: "step-1",
          name: "Create Payment",
          method: "POST",
          url: "https://api.example.com/payments",
          headers: [{ key: "x-api-key", value: "secret", enabled: true }],
          params: [{ key: "mode", value: "test", enabled: true }],
          body: '{"amount":1200}',
          bodyType: "json",
          formDataFields: [],
          auth: { type: "none" },
          preRequestEditorType: "visual",
          postRequestEditorType: "visual",
          testEditorType: "visual",
          preRequestRules: [],
          postRequestRules: [],
          testRules: [],
          preRequestScript: "",
          postRequestScript: "",
          testScript: "",
          pollingPolicy: { enabled: false, intervalMs: 2000, successRules: [] },
          webhookWaitPolicy: {
            enabled: false,
            timeoutMs: 60000,
            pollIntervalMs: 2000,
            correlationKeyTemplate: "",
            correlationSource: "body",
            correlationField: "",
          },
          mockConfig: {
            enabled: false,
            statusCode: 200,
            body: "",
            latencyMs: 0,
          },
        },
      ],
      flowDocument: {
        kind: "flow-document",
        version: 1,
        id: "pipeline-1",
        name: "Checkout Flow",
        viewport: { x: 0, y: 0, zoom: 1 },
        nodes: [
          {
            id: "step-1",
            kind: "request",
            position: { x: 0, y: 0 },
            requestRef: "step-1",
            dataRef: "step-1",
            config: { kind: "request", label: "Create Payment" },
          },
        ],
        edges: [],
      },
    },
  ],
  subflowDefinitions: [],
  replaceFlowDocument: vi.fn(),
  updateStep: vi.fn(),
  updateSubflowNode: vi.fn(),
};

const environmentState = {
  environments: [{ id: "env-1", name: "Default", variables: [] }],
  activeEnvironmentId: "env-1",
};

const executionState = {
  runtimeVariables: {},
};

const timelineState = {
  syncGeneration: 0,
  eventById: new Map(),
};

vi.mock("@/features/pipeline/autocomplete", () => ({
  useVariableSuggestions: vi.fn(() => []),
}));

vi.mock("@/features/pipeline/request-routing", () => ({
  buildRequestRouteOptions: vi.fn((steps, currentStepId) =>
    steps
      .filter((step: { id: string }) => step.id !== currentStepId)
      .map((step: { id: string; name: string; method: string; url: string }, index: number) => ({
        stepId: step.id,
        stepIndex: index,
        label: step.name,
        subtitle: step.url,
        detail: `Request ${index + 1}`,
        method: step.method,
      })),
  ),
  getRequestRouteTargets: vi.fn(() => ({ success: null, failure: null })),
  getConditionRouteTargets: vi.fn((document, nodeId) => {
    const trueEdge = document?.edges.find(
      (edge: { source: string; semantics: string }) =>
        edge.source === nodeId && edge.semantics === "true",
    );
    const falseEdge = document?.edges.find(
      (edge: { source: string; semantics: string }) =>
        edge.source === nodeId && edge.semantics === "false",
    );
    return { true: trueEdge?.target ?? null, false: falseEdge?.target ?? null };
  }),
  resolveRequestRouteDisplay: vi.fn((_target, _options, title, description) => ({
    label: title,
    subtitle: description,
    detail: title,
    method: null,
  })),
  updateRequestRouteTargets: vi.fn((document) => document),
  updateConditionRouteTargets: vi.fn((document, nodeId, targets) => ({
    ...document,
    edges: [
      ...document.edges.filter(
        (edge: { source: string; semantics: string }) =>
          edge.source !== nodeId || (edge.semantics !== "true" && edge.semantics !== "false"),
      ),
      ...(targets.true
        ? [
            {
              id: `${nodeId}:true:${targets.true}`,
              source: nodeId,
              target: targets.true,
              semantics: "true",
            },
          ]
        : []),
      ...(targets.false
        ? [
            {
              id: `${nodeId}:false:${targets.false}`,
              source: nodeId,
              target: targets.false,
              semantics: "false",
            },
          ]
        : []),
    ],
  })),
}));

vi.mock("@/stores/usePipelineStore", () => ({
  usePipelineStore: vi.fn(() => pipelineStoreState),
}));

vi.mock("@/stores/useEnvironmentStore", () => ({
  useEnvironmentStore: vi.fn((selector: (state: typeof environmentState) => unknown) =>
    selector(environmentState),
  ),
}));

vi.mock("@/stores/usePipelineExecutionStore", () => ({
  usePipelineExecutionStore: vi.fn((selector: (state: typeof executionState) => unknown) =>
    selector(executionState),
  ),
}));

vi.mock("@/stores/useTimelineStore", () => {
  const store = Object.assign(
    (selector: (state: typeof timelineState) => unknown) => selector(timelineState),
    {
      getState: () => timelineState,
    },
  );

  return {
    useTimelineStore: store,
  };
});

vi.mock("@/features/pipelines/components/PipelineInspectorEditorSections", () => ({
  PipelineInspectorEditorSections: ({ section }: { section: string }) => (
    <div>{`Inspector section: ${section}`}</div>
  ),
}));

vi.mock("@/components/pipelines/PipelineRoutingPanel", () => ({
  PipelineRoutingPanel: () => <div>Routing panel</div>,
}));

vi.mock("@/features/request-editor/components/RequestMockPanel", () => ({
  RequestMockPanel: () => <div>Mock panel</div>,
}));

describe("PipelineSideInspector", () => {
  it("renders top-level inspector tabs without the old left-side navigation", () => {
    render(<PipelineSideInspector pipelineId="pipeline-1" stepId="step-1" onClose={vi.fn()} />);

    expect(
      screen.queryByRole("navigation", { name: /inspector sections/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("tablist", { name: /request inspector sections/i }),
    ).toBeInTheDocument();

    expect(screen.getByRole("tab", { name: /request/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /flow/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /routing/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /mock/i })).toBeInTheDocument();
  });

  it("switches between top-level sections in the single-column inspector", async () => {
    const user = userEvent.setup();

    render(<PipelineSideInspector pipelineId="pipeline-1" stepId="step-1" onClose={vi.fn()} />);

    expect(screen.getByText("Inspector section: request")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /flow/i }));
    expect(screen.getByText("Inspector section: flow")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /routing/i }));
    expect(screen.getByText("Routing panel")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /mock/i }));
    expect(screen.getByText("Mock panel")).toBeInTheDocument();
  });

  it("shows connected condition path targets in the routing inspector", async () => {
    const user = userEvent.setup();
    const flowDocument = pipelineStoreState.pipelines[0].flowDocument as any;
    const steps = pipelineStoreState.pipelines[0].steps as any[];
    const originalNodeCount = flowDocument.nodes.length;
    const originalEdgeCount = flowDocument.edges.length;
    const originalStepCount = steps.length;

    flowDocument.nodes.push({
      id: "cond-1",
      kind: "condition",
      position: { x: 320, y: 0 },
      config: { kind: "condition", label: "Branch", rules: [], expression: "true" },
    });
    flowDocument.nodes.push({
      id: "step-2",
      kind: "request",
      position: { x: 640, y: -80 },
      requestRef: "step-2",
      dataRef: "step-2",
      config: { kind: "request", label: "True branch" },
    });
    steps.push({
      ...steps[0],
      id: "step-2",
      name: "True branch",
      method: "GET",
      url: "https://api.example.com/true",
    });
    flowDocument.nodes.push({
      id: "step-3",
      kind: "request",
      position: { x: 640, y: 80 },
      requestRef: "step-3",
      dataRef: "step-3",
      config: { kind: "request", label: "False branch" },
    });
    steps.push({
      ...steps[0],
      id: "step-3",
      name: "False branch",
      method: "POST",
      url: "https://api.example.com/false",
    });
    flowDocument.edges.push({
      id: "step-1-cond-1",
      source: "step-1",
      target: "cond-1",
      semantics: "control",
    });
    flowDocument.edges.push({
      id: "cond-1-step-2",
      source: "cond-1",
      target: "step-2",
      semantics: "true",
    });
    flowDocument.edges.push({
      id: "cond-1-step-3",
      source: "cond-1",
      target: "step-3",
      semantics: "false",
    });

    render(<PipelineSideInspector pipelineId="pipeline-1" stepId="step-1" onClose={vi.fn()} />);

    await user.click(screen.getByRole("tab", { name: /routing/i }));

    expect(screen.getByText("→ True branch")).toBeInTheDocument();
    expect(screen.getByText("→ False branch")).toBeInTheDocument();

    steps.splice(originalStepCount);
    flowDocument.nodes.splice(originalNodeCount);
    flowDocument.edges.splice(originalEdgeCount);
  });

  it("seeds a default true branch when adding a condition", async () => {
    const user = userEvent.setup();
    const pipeline = pipelineStoreState.pipelines[0] as any;
    const flowDocument = pipeline.flowDocument;
    const steps = pipeline.steps as any[];
    const originalNodeCount = flowDocument.nodes.length;
    const originalEdgeCount = flowDocument.edges.length;
    const originalStepCount = steps.length;

    steps.push({
      ...steps[0],
      id: "step-2",
      name: "Review Payment",
      method: "GET",
      url: "https://api.example.com/review",
    });
    flowDocument.nodes.push({
      id: "step-2",
      kind: "request",
      position: { x: 320, y: 0 },
      requestRef: "step-2",
      dataRef: "step-2",
      config: { kind: "request", label: "Review Payment" },
    });

    render(<PipelineSideInspector pipelineId="pipeline-1" stepId="step-1" onClose={vi.fn()} />);

    await user.click(screen.getByRole("tab", { name: /routing/i }));
    await user.click(screen.getByRole("button", { name: /add if \/ else condition/i }));

    expect(pipelineStoreState.replaceFlowDocument).toHaveBeenCalled();
    const [, nextDocument] = vi.mocked(pipelineStoreState.replaceFlowDocument).mock.calls.at(-1)!;
    const conditionNode = nextDocument.nodes.find(
      (node: { kind: string }) => node.kind === "condition",
    );

    expect(conditionNode).toBeDefined();
    expect(
      nextDocument.edges.some(
        (edge: { source: string; target: string; semantics: string }) =>
          edge.source === "step-1" &&
          edge.target === conditionNode.id &&
          edge.semantics === "control",
      ),
    ).toBe(true);
    expect(
      nextDocument.edges.some(
        (edge: { source: string; target: string; semantics: string }) =>
          edge.source === conditionNode.id && edge.target === "step-2" && edge.semantics === "true",
      ),
    ).toBe(true);

    steps.splice(originalStepCount);
    flowDocument.nodes.splice(originalNodeCount);
    flowDocument.edges.splice(originalEdgeCount);
  });
});
