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
  buildRequestRouteOptions: vi.fn(() => []),
  getRequestRouteTargets: vi.fn(() => ({ success: null, failure: null })),
  resolveRequestRouteDisplay: vi.fn((_target, _options, title, description) => ({
    title,
    description,
  })),
  updateRequestRouteTargets: vi.fn((document) => document),
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
});
