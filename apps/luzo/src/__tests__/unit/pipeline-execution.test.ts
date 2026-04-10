import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeRequest } from "@/app/actions/api-tests";
import { executeRequestStream } from "@/server/http/client";
import type { AnalysisWorkerApi, GraphWorkerApi } from "@/types/workers";
import {
  type GeneratorExecutorModule,
  createPipelineGenerator,
} from "@/features/pipeline/generator-executor";
import { applyEvent, createInitialState } from "@/features/pipeline/debug-controller-state";
import type { CheckpointArtifact } from "@/features/pipeline/pipeline-persistence";
import { restoreFromCheckpoint } from "@/features/pipeline/pipeline-persistence";
import { buildWorkflowBundleFromPipeline } from "@/features/workflow/pipeline-adapters";
import { compileExecutionPlan } from "@/features/workflow/compiler/compileExecutionPlan";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { useTimelineStore } from "@/stores/useTimelineStore";
import type { Pipeline } from "@/types";
import type { GeneratorYield, StepAbortControl, StepSnapshot } from "@/types/pipeline-runtime";

interface MockStepVariables {
  req1: {
    response: {
      body: Record<string, unknown>;
    };
  };
}

vi.mock("@/app/actions/api-tests", () => ({
  executeRequest: vi.fn(),
}));

vi.mock("@/server/http/client", () => ({
  executeRequestStream: vi.fn(),
}));

vi.mock("@/workers/client/analysis-client", () => ({
  analysisWorkerClient: {
    callLatest: vi
      .fn()
      .mockImplementation(async (cb: (api: AnalysisWorkerApi) => Promise<unknown>) => {
        // Mock the analysis API
        const api: Partial<AnalysisWorkerApi> = {
          rebuildRuntimeVariables: vi.fn().mockResolvedValue({
            ok: true,
            data: { req1: { response: { body: "ok" } } },
          }),
          analyzeVariables: vi.fn(),
          buildVariableSuggestions: vi.fn(),
        };
        return cb(api as AnalysisWorkerApi);
      }),
    get: vi.fn().mockResolvedValue({
      rebuildRuntimeVariables: vi.fn().mockResolvedValue({
        ok: true,
        data: { req1: { response: { body: "ok" } } },
      }),
    }),
  },
}));

vi.mock("@/workers/client/graph-client", () => ({
  graphWorkerClient: {
    callLatest: vi.fn(async (_key: string, invoke: (api: GraphWorkerApi) => Promise<unknown>) => {
      const mockApi: Partial<GraphWorkerApi> = {
        compileExecutionPlan: async (input) => {
          const { plan, warnings } = compileExecutionPlan(input);
          return { ok: true, data: { plan, warnings, aliases: [] } };
        },
      };
      return invoke(mockApi as GraphWorkerApi);
    }),
  },
}));

vi.mock("@/features/pipeline/generator-executor", async (importOriginal) => {
  const actual: GeneratorExecutorModule = await importOriginal();
  return {
    ...actual,
    createPipelineGenerator: vi.fn(actual.createPipelineGenerator),
  };
});

const mockPipeline: Pipeline = {
  id: "test-pipeline",
  name: "Test Pipeline",
  steps: [
    {
      id: "step-1",
      name: "Step 1",
      url: "https://api.example.com",
      method: "GET",
      headers: [],
      params: [],
      body: null,
      bodyType: "none",
      auth: { type: "none" },
    },
  ],
  narrativeConfig: { tone: "technical", prompt: "", enabled: true },
  createdAt: "",
  updatedAt: "",
};

const mockResponse = {
  status: 200,
  statusText: "OK",
  headers: { "content-type": "application/json" },
  body: '{"message": "success"}',
  time: 100,
  size: 20,
};

function makeStepSnapshot(overrides: Partial<StepSnapshot> = {}): StepSnapshot {
  return {
    stepId: "step-1",
    stepIndex: 0,
    stepName: "Step 1",
    entryType: "request",
    method: "GET",
    url: "https://api.example.com",
    resolvedRequest: {
      method: "GET",
      url: "https://api.example.com",
      headers: {},
      body: null,
    },
    status: "running",
    reducedResponse: null,
    variables: {},
    error: null,
    startedAt: Date.now(),
    completedAt: null,
    streamStatus: "idle",
    streamChunks: [],
    ...overrides,
  };
}

beforeEach(() => {
  usePipelineExecutionStore.getState().reset();
  useTimelineStore.getState().reset();
});

describe("Pipeline Execution Architecture", () => {
  it("uses normal execution (executeRequest) when useStream is false", async () => {
    vi.mocked(executeRequest).mockResolvedValue(mockResponse);

    const abortControls = new Map();
    const masterAbort = new AbortController();
    const generator = createPipelineGenerator(
      mockPipeline,
      {},
      {
        abortControls,
        masterAbort,
        useStream: false,
      },
    );

    const yields: GeneratorYield[] = [];
    let result = await generator.next();
    while (!result.done) {
      yields.push(result.value);
      result = await generator.next();
    }

    // Verify correct function was called
    expect(executeRequest).toHaveBeenCalled();
    expect(executeRequestStream).not.toHaveBeenCalled();

    // Verify yield types
    const types = yields.map((y) => y.type);
    expect(types).toContain("step_ready");
    expect(types).toContain("execution_started");
    expect(types).toContain("step_completed");
    expect(types).not.toContain("step_stream_chunk");

    // Verify final snapshot consistency
    const lastYield = yields.findLast((y) => y.type === "step_completed");
    expect(lastYield?.type).toBe("step_completed");
    if (!lastYield || lastYield.type !== "step_completed") throw new Error("missing completion");
    expect(lastYield.snapshot.status).toBe("success");

    const variables = lastYield.snapshot.variables as unknown as MockStepVariables;
    expect(variables?.req1.response.body).toEqual({
      message: "success",
    });
  });

  it("uses streaming execution (executeRequestStream) when useStream is true", async () => {
    async function* mockStream(): AsyncGenerator<{ chunk: string }, typeof mockResponse, unknown> {
      yield { chunk: '{"mess' };
      yield { chunk: 'age": "success"}' };
      return mockResponse;
    }
    vi.mocked(executeRequestStream).mockReturnValue(mockStream());

    const abortControls = new Map<string, StepAbortControl>();
    const masterAbort = new AbortController();
    const yields: GeneratorYield[] = [];
    const generator = createPipelineGenerator(
      mockPipeline,
      {},
      {
        abortControls,
        masterAbort,
        useStream: true,
      },
    );

    let result = await generator.next();
    while (!result.done) {
      yields.push(result.value);
      result = await generator.next();
    }

    // Verify correct function was called
    expect(executeRequestStream).toHaveBeenCalled();

    // Verify yield types
    const types = yields.map((y) => y.type);
    expect(types).toContain("step_ready");
    expect(types).toContain("step_stream_chunk");
    expect(types).toContain("step_completed");

    // Verify stream chunks were collected
    const streamYields = yields.filter((y) => y.type === "step_stream_chunk");
    expect(streamYields.length).toBeGreaterThan(0);

    // Verify final snapshot consistency is identical to normal execution
    const lastYield = yields.findLast((y) => y.type === "step_completed");
    expect(lastYield?.type).toBe("step_completed");
    if (!lastYield || lastYield.type !== "step_completed") throw new Error("missing completion");
    expect(lastYield.snapshot.status).toBe("success");

    const variables = lastYield.snapshot.variables as unknown as MockStepVariables;
    expect(variables?.req1.response.body).toEqual({
      message: "success",
    });
  });

  it("does not render a placeholder timeline row for condition step_ready", () => {
    const state = createInitialState();
    state.executionId = "exec-1";

    applyEvent(state, {
      type: "step_ready",
      snapshot: makeStepSnapshot({
        stepId: "condition-1",
        stepName: "Status gate",
        entryType: "condition",
        url: "",
        resolvedRequest: {
          method: "GET",
          url: "",
          headers: {},
          body: null,
        },
      }),
    });

    expect(useTimelineStore.getState().orderedIds).toHaveLength(0);

    applyEvent(state, {
      type: "condition_evaluated",
      snapshot: makeStepSnapshot({
        stepId: "condition-1",
        stepName: "Status gate",
        entryType: "condition",
        status: "done",
        url: "",
        resolvedRequest: {
          method: "GET",
          url: "",
          headers: {},
          body: null,
        },
        completedAt: Date.now(),
        conditionResult: {
          result: true,
          resolvedInputs: { "req1.response.status": 200 },
        },
      }),
      result: true,
      runtimeVariables: {},
    });

    const timeline = useTimelineStore.getState();
    expect(timeline.orderedIds).toHaveLength(1);
    expect(timeline.eventById.get("exec-1:condition-1")?.eventKind).toBe("condition_evaluated");
  });

  it("does not emit a placeholder condition step_ready during auto execution", async () => {
    const pipelineWithCondition: Pipeline = {
      ...mockPipeline,
      steps: [
        {
          ...mockPipeline.steps[0],
          id: "step-a",
          name: "Step A",
          url: "https://api.example.com/a",
        },
        {
          ...mockPipeline.steps[0],
          id: "step-b",
          name: "Step B",
          url: "https://api.example.com/b",
        },
      ],
      flowDocument: {
        kind: "flow-document",
        version: 1,
        id: "pipeline-condition-auto",
        name: "Pipeline Condition Auto",
        viewport: { x: 0, y: 0, zoom: 1 },
        nodes: [
          {
            id: "step-a",
            kind: "request",
            position: { x: 0, y: 0 },
            requestRef: "step-a",
            dataRef: "step-a",
            config: { kind: "request", label: "Step A" },
          },
          {
            id: "cond-1",
            kind: "condition",
            position: { x: 240, y: 0 },
            config: {
              kind: "condition",
              label: "Status gate",
              rules: [
                {
                  id: "rule-1",
                  valueRef: "req1.response.status",
                  operator: "equals",
                  value: "200",
                },
              ],
              expression: "",
            },
          },
          {
            id: "step-b",
            kind: "request",
            position: { x: 480, y: 0 },
            requestRef: "step-b",
            dataRef: "step-b",
            config: { kind: "request", label: "Step B" },
          },
        ],
        edges: [
          {
            id: "step-a:cond-1:control",
            source: "step-a",
            target: "cond-1",
            semantics: "control",
          },
          {
            id: "cond-1:step-b:true",
            source: "cond-1",
            target: "step-b",
            semantics: "true",
          },
        ],
      },
    };

    vi.mocked(executeRequest)
      .mockResolvedValueOnce({
        ...mockResponse,
        status: 200,
      })
      .mockResolvedValueOnce(mockResponse);

    const generator = createPipelineGenerator(
      pipelineWithCondition,
      {},
      {
        abortControls: new Map(),
        masterAbort: new AbortController(),
        useStream: false,
      },
    );

    const eventTypes: string[] = [];
    let result = await generator.next();
    while (!result.done) {
      eventTypes.push(result.value.type);
      result = await generator.next();
    }

    expect(eventTypes.filter((type) => type === "condition_evaluated")).toHaveLength(1);
    expect(eventTypes.filter((type) => type === "step_ready")).toHaveLength(2);
  });

  it("keeps controller and store snapshots de-aliased during streaming debug updates", () => {
    const state = createInitialState();
    state.executionId = "exec-debug";
    state.executionMode = "debug";

    const liveSnapshot = makeStepSnapshot();

    expect(() =>
      applyEvent(state, {
        type: "step_ready",
        snapshot: liveSnapshot,
      }),
    ).not.toThrow();

    const storeSnapshot = usePipelineExecutionStore.getState().snapshots[0];
    expect(storeSnapshot).toBeDefined();
    expect(storeSnapshot).not.toBe(liveSnapshot);
    expect(state.snapshots[0]).not.toBe(liveSnapshot);
    expect(state.snapshots[0]).not.toBe(storeSnapshot);

    expect(() => {
      liveSnapshot.streamStatus = "streaming";
      liveSnapshot.streamChunks.push('{"partial":');
    }).not.toThrow();

    expect(() =>
      applyEvent(state, {
        type: "step_stream_chunk",
        snapshot: liveSnapshot,
        chunk: '{"partial":',
      }),
    ).not.toThrow();

    const updatedStoreSnapshot = usePipelineExecutionStore.getState().snapshots[0];
    expect(updatedStoreSnapshot?.streamStatus).toBe("streaming");
    expect(updatedStoreSnapshot?.streamChunks).toEqual(['{"partial":']);
    expect(storeSnapshot?.streamStatus).toBe("idle");

    liveSnapshot.streamStatus = "done";
    liveSnapshot.streamChunks.push('"ok"}');
    liveSnapshot.status = "success";
    liveSnapshot.completedAt = Date.now();
    liveSnapshot.reducedResponse = {
      status: 200,
      statusText: "OK",
      latencyMs: 100,
      sizeBytes: 20,
      summary: { ok: true },
      headers: {},
    };

    expect(() =>
      applyEvent(state, {
        type: "step_completed",
        snapshot: liveSnapshot,
        runtimeVariables: { req1: { response: { body: { ok: true } } } },
      }),
    ).not.toThrow();

    const completedStoreSnapshot = usePipelineExecutionStore.getState().snapshots[0];
    expect(completedStoreSnapshot?.streamStatus).toBe("done");
    expect(completedStoreSnapshot?.status).toBe("success");
    expect(state.snapshots[0]?.streamStatus).toBe("done");
  });

  it("keeps restored controller snapshots mutable after hydrating the execution store", () => {
    const artifact: CheckpointArtifact = {
      executionId: "exec-restore",
      pipelineId: "pipeline-1",
      generatedAt: new Date().toISOString(),
      pipelineStructureHash: "hash-1",
      isDirty: true,
      runtime: {
        mode: "debug",
        originExecutionMode: "debug",
        startStepId: null,
        reusedAliases: [],
        staleContextWarning: null,
        completedAt: null,
        currentStepIndex: 0,
        totalSteps: 1,
        errorMessage: null,
      },
      steps: [
        {
          stepId: "step-1",
          alias: "req1",
          stepName: "Step 1",
          method: "GET",
          url: "https://api.example.com",
          status: "success",
          reducedResponse: {
            status: 200,
            statusText: "OK",
            latencyMs: 100,
            sizeBytes: 20,
            summary: { ok: true },
            headers: {},
          },
          resolvedRequestSummary: {
            url: "https://api.example.com",
            headers: {},
            bodyPreview: null,
          },
          error: null,
          completedAt: new Date().toISOString(),
        },
      ],
      stepContextByAlias: {
        req1: {
          stepId: "step-1",
          alias: "req1",
          payload: { response: { body: { ok: true } } },
        },
      },
      warnings: [],
    };

    const restored = restoreFromCheckpoint(artifact);
    expect(restored.originExecutionMode).toBe("debug");
    usePipelineExecutionStore.getState().applyControllerSnapshot(restored);

    const liveSnapshot = restored.snapshots[0];
    expect(liveSnapshot).toBeDefined();

    expect(() => {
      liveSnapshot!.streamStatus = "streaming";
      liveSnapshot!.streamChunks.push('{"chunk":1}');
    }).not.toThrow();

    const state = createInitialState();
    state.executionId = restored.executionId;
    state.executionMode = "debug";

    expect(() =>
      applyEvent(state, {
        type: "step_stream_chunk",
        snapshot: liveSnapshot!,
        chunk: '{"chunk":1}',
      }),
    ).not.toThrow();

    expect(usePipelineExecutionStore.getState().snapshots[0]?.streamStatus).toBe("streaming");
    expect(restored.snapshots[0]?.streamStatus).toBe("streaming");
  });

  it("populates resolvedRequest with fullUrl including query params", async () => {
    const pipelineWithParams: Pipeline = {
      ...mockPipeline,
      steps: [
        {
          ...mockPipeline.steps[0],
          params: [
            { key: "foo", value: "bar", enabled: true },
            { key: "baz", value: "qux", enabled: false }, // disabled
          ],
        },
      ],
    };

    vi.mocked(executeRequest).mockResolvedValue(mockResponse);

    const abortControls = new Map();
    const masterAbort = new AbortController();
    const generator = createPipelineGenerator(
      pipelineWithParams,
      {},
      {
        abortControls,
        masterAbort,
        useStream: false,
      },
    );

    let result = await generator.next();
    while (!result.done) {
      if (result.value.type === "step_completed") {
        expect(result.value.snapshot.resolvedRequest.url).toBe("https://api.example.com?foo=bar");
        expect(result.value.snapshot.resolvedRequest.method).toBe("GET");
      }
      result = await generator.next();
    }
  });

  it("resolves runtime variables inside bearer auth for downstream steps", async () => {
    vi.mocked(executeRequest).mockReset();

    const pipelineWithBearerChain: Pipeline = {
      ...mockPipeline,
      steps: [
        {
          ...mockPipeline.steps[0],
          id: "step-1",
          name: "Login",
          method: "POST",
          url: "https://api.example.com/login",
        },
        {
          ...mockPipeline.steps[0],
          id: "step-2",
          name: "Profile",
          method: "GET",
          url: "https://api.example.com/me",
          auth: {
            type: "bearer",
            bearer: {
              token: "{{req1.response.body.access_token}}",
            },
          },
        },
      ],
    };

    vi.mocked(executeRequest)
      .mockResolvedValueOnce({
        ...mockResponse,
        body: '{"access_token":"token-123"}',
      })
      .mockImplementationOnce(async (request) => {
        expect(request.auth).toEqual({
          type: "bearer",
          bearer: { token: "token-123" },
        });
        return mockResponse;
      });

    const abortControls = new Map();
    const masterAbort = new AbortController();
    const generator = createPipelineGenerator(
      pipelineWithBearerChain,
      {},
      {
        abortControls,
        masterAbort,
        useStream: false,
      },
    );

    let result = await generator.next();
    while (!result.done) {
      result = await generator.next();
    }

    expect(executeRequest).toHaveBeenCalledTimes(2);
  });

  it("resolves manually typed step-name aliases for downstream auth", async () => {
    vi.mocked(executeRequest).mockReset();

    const pipelineWithNamedAlias: Pipeline = {
      ...mockPipeline,
      steps: [
        {
          ...mockPipeline.steps[0],
          id: "step-login",
          name: "Login",
          method: "POST",
          url: "https://api.example.com/login",
        },
        {
          ...mockPipeline.steps[0],
          id: "step-profile",
          name: "Profile",
          method: "GET",
          url: "https://api.example.com/me",
          auth: {
            type: "bearer",
            bearer: {
              token: "{{login.response.body.access_token}}",
            },
          },
        },
      ],
    };

    vi.mocked(executeRequest)
      .mockResolvedValueOnce({
        ...mockResponse,
        body: '{"access_token":"token-by-name"}',
      })
      .mockImplementationOnce(async (request) => {
        expect(request.auth).toEqual({
          type: "bearer",
          bearer: { token: "token-by-name" },
        });
        return mockResponse;
      });

    const generator = createPipelineGenerator(
      pipelineWithNamedAlias,
      {},
      {
        abortControls: new Map(),
        masterAbort: new AbortController(),
        useStream: false,
      },
    );

    let result = await generator.next();
    while (!result.done) {
      result = await generator.next();
    }

    expect(executeRequest).toHaveBeenCalledTimes(2);
  });

  it("prefers explicit request routes over fallback control edges", () => {
    const pipelineWithRoutes: Pipeline = {
      id: "route-pipeline",
      name: "Route Pipeline",
      createdAt: "",
      updatedAt: "",
      narrativeConfig: { tone: "technical", prompt: "", enabled: true },
      steps: [
        {
          id: "step-a",
          name: "Login",
          method: "POST",
          url: "https://api.example.com/login",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-b",
          name: "Sequential Fallback",
          method: "GET",
          url: "https://api.example.com/fallback",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-c",
          name: "Success Route",
          method: "GET",
          url: "https://api.example.com/success",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
      ],
      flowDocument: {
        kind: "flow-document",
        version: 1,
        id: "route-pipeline",
        name: "Route Pipeline",
        viewport: { x: 0, y: 0, zoom: 1 },
        nodes: [
          {
            id: "route-pipeline:start",
            kind: "start",
            geometry: { position: { x: 0, y: 0 } },
            position: { x: 0, y: 0 },
            config: { kind: "start", label: "Start" },
          },
          {
            id: "step-a",
            kind: "request",
            geometry: { position: { x: 100, y: 0 } },
            position: { x: 100, y: 0 },
            dataRef: "step-a",
            requestRef: "step-a",
            config: { kind: "request", label: "Login" },
          },
          {
            id: "step-b",
            kind: "request",
            geometry: { position: { x: 200, y: 0 } },
            position: { x: 200, y: 0 },
            dataRef: "step-b",
            requestRef: "step-b",
            config: { kind: "request", label: "Sequential Fallback" },
          },
          {
            id: "step-c",
            kind: "request",
            geometry: { position: { x: 300, y: 0 } },
            position: { x: 300, y: 0 },
            dataRef: "step-c",
            requestRef: "step-c",
            config: { kind: "request", label: "Success Route" },
          },
        ],
        edges: [
          {
            id: "step-a:step-b:control",
            source: "step-a",
            target: "step-b",
            semantics: "control",
          },
          {
            id: "step-a:success:step-c",
            source: "step-a",
            target: "step-c",
            semantics: "success",
          },
        ],
      },
    };

    const bundle = buildWorkflowBundleFromPipeline(pipelineWithRoutes);
    const { plan, warnings } = compileExecutionPlan({
      workflow: bundle.workflow,
      registry: bundle.registry,
    });

    expect(warnings).toEqual([]);
    const sourceNode = plan.nodes.find((node) => node.nodeId === "step-a");
    expect(sourceNode?.routes.control).toEqual([]);
    expect(sourceNode?.routes.success).toEqual(["step-c"]);
  });

  it("executes the explicit failure route when a request returns an error response", async () => {
    vi.mocked(executeRequest).mockReset();

    const pipelineWithFailureRoute: Pipeline = {
      id: "failure-route-pipeline",
      name: "Failure Route Pipeline",
      createdAt: "",
      updatedAt: "",
      narrativeConfig: { tone: "technical", prompt: "", enabled: true },
      steps: [
        {
          id: "step-a",
          name: "Primary request",
          method: "POST",
          url: "https://api.example.com/login",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-b",
          name: "Failure Route",
          method: "GET",
          url: "https://api.example.com/failure",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
      ],
      flowDocument: {
        kind: "flow-document",
        version: 1,
        id: "failure-route-pipeline",
        name: "Failure Route Pipeline",
        viewport: { x: 0, y: 0, zoom: 1 },
        nodes: [
          {
            id: "failure-route-pipeline:start",
            kind: "start",
            geometry: { position: { x: 0, y: 0 } },
            position: { x: 0, y: 0 },
            config: { kind: "start", label: "Start" },
          },
          {
            id: "step-a",
            kind: "request",
            geometry: { position: { x: 100, y: 0 } },
            position: { x: 100, y: 0 },
            dataRef: "step-a",
            requestRef: "step-a",
            config: { kind: "request", label: "Primary request" },
          },
          {
            id: "step-b",
            kind: "request",
            geometry: { position: { x: 300, y: 80 } },
            position: { x: 300, y: 80 },
            dataRef: "step-b",
            requestRef: "step-b",
            config: { kind: "request", label: "Failure Route" },
          },
        ],
        edges: [
          {
            id: "step-a:failure:step-b",
            source: "step-a",
            target: "step-b",
            sourceHandle: "fail",
            semantics: "failure",
          },
        ],
      },
    };

    vi.mocked(executeRequest)
      .mockResolvedValueOnce({
        ...mockResponse,
        status: 500,
        statusText: "Server Error",
      })
      .mockImplementationOnce(async (request) => {
        expect(request.url).toBe("https://api.example.com/failure");
        return mockResponse;
      });

    const generator = createPipelineGenerator(
      pipelineWithFailureRoute,
      {},
      {
        abortControls: new Map(),
        masterAbort: new AbortController(),
        useStream: false,
      },
    );

    const eventTypes: string[] = [];
    let result = await generator.next();
    while (!result.done) {
      eventTypes.push(result.value.type);
      result = await generator.next();
    }

    expect(eventTypes).toContain("step_failed");
    expect(executeRequest).toHaveBeenCalledTimes(2);
    expect(
      vi
        .mocked(executeRequest)
        .mock.calls.some(([request]) => request.url === "https://api.example.com/failure"),
    ).toBe(true);
  });

  it("resolves downstream templates from coined transform runtime aliases", async () => {
    vi.mocked(executeRequest).mockReset();

    const pipelineWithTransform: Pipeline = {
      id: "transform-pipeline",
      name: "Transform Pipeline",
      createdAt: "",
      updatedAt: "",
      narrativeConfig: { tone: "technical", prompt: "", enabled: true },
      steps: [
        {
          id: "step-a",
          name: "Fetch token",
          method: "GET",
          url: "https://api.example.com/token",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-b",
          name: "Use token",
          method: "GET",
          url: "https://api.example.com/{{transform1.output.token}}",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
      ],
      flowDocument: {
        kind: "flow-document",
        version: 1,
        id: "transform-pipeline",
        name: "Transform Pipeline",
        viewport: { x: 0, y: 0, zoom: 1 },
        nodes: [
          {
            id: "transform-pipeline:start",
            kind: "start",
            geometry: { position: { x: 0, y: 0 } },
            position: { x: 0, y: 0 },
            config: { kind: "start", label: "Start" },
          },
          {
            id: "step-a",
            kind: "request",
            geometry: { position: { x: 100, y: 0 } },
            position: { x: 100, y: 0 },
            dataRef: "step-a",
            requestRef: "step-a",
            config: { kind: "request", label: "Fetch token" },
          },
          {
            id: "transform-1",
            kind: "transform",
            geometry: { position: { x: 240, y: 0 } },
            position: { x: 240, y: 0 },
            config: {
              kind: "transform",
              label: "Token Shape",
              script: "{ token: req1.response.body.token }",
            },
          },
          {
            id: "step-b",
            kind: "request",
            geometry: { position: { x: 380, y: 0 } },
            position: { x: 380, y: 0 },
            dataRef: "step-b",
            requestRef: "step-b",
            config: { kind: "request", label: "Use token" },
          },
        ],
        edges: [
          {
            id: "step-a-transform-1",
            source: "step-a",
            target: "transform-1",
            semantics: "control",
          },
          {
            id: "transform-1-step-b",
            source: "transform-1",
            target: "step-b",
            semantics: "control",
          },
        ],
      },
    };

    vi.mocked(executeRequest)
      .mockResolvedValueOnce({
        ...mockResponse,
        body: '{"token":"abc"}',
      })
      .mockImplementationOnce(async (request) => {
        expect(request.url).toBe("https://api.example.com/abc");
        return mockResponse;
      });

    const generator = createPipelineGenerator(
      pipelineWithTransform,
      {},
      {
        abortControls: new Map(),
        masterAbort: new AbortController(),
        useStream: false,
      },
    );

    let transformRuntimeVariables: Record<string, unknown> | null = null;
    let transformTerminalEvent: {
      type: "step_completed" | "step_failed";
      error: string | null;
    } | null = null;
    let result = await generator.next();
    while (!result.done) {
      if (
        (result.value.type === "step_completed" || result.value.type === "step_failed") &&
        result.value.snapshot.stepId === "transform-1"
      ) {
        transformRuntimeVariables = result.value.runtimeVariables;
        transformTerminalEvent = {
          type: result.value.type,
          error: result.value.snapshot.error,
        };
      }
      result = await generator.next();
    }

    expect(transformTerminalEvent).toEqual({
      type: "step_completed",
      error: null,
    });
    expect(transformRuntimeVariables).toMatchObject({
      "transform-1": { output: { token: "abc" } },
      transform1: { output: { token: "abc" } },
      token_shape: { output: { token: "abc" } },
    });
    expect(transformRuntimeVariables?.["transform-1.output"]).toBeUndefined();
    expect(executeRequest).toHaveBeenCalledTimes(2);
  });

  it("executes condition nodes and ignores stale direct request routes once a condition is attached", async () => {
    vi.mocked(executeRequest).mockReset();

    const pipelineWithCondition: Pipeline = {
      id: "condition-pipeline",
      name: "Condition Pipeline",
      createdAt: "",
      updatedAt: "",
      narrativeConfig: { tone: "technical", prompt: "", enabled: true },
      steps: [
        {
          id: "step-a",
          name: "Fetch status",
          method: "GET",
          url: "https://api.example.com/status",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-b",
          name: "True branch",
          method: "GET",
          url: "https://api.example.com/true",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-c",
          name: "False branch",
          method: "GET",
          url: "https://api.example.com/false",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
      ],
      flowDocument: {
        kind: "flow-document",
        version: 1,
        id: "condition-pipeline",
        name: "Condition Pipeline",
        viewport: { x: 0, y: 0, zoom: 1 },
        nodes: [
          {
            id: "condition-pipeline:start",
            kind: "start",
            geometry: { position: { x: 0, y: 0 } },
            position: { x: 0, y: 0 },
            config: { kind: "start", label: "Start" },
          },
          {
            id: "step-a",
            kind: "request",
            geometry: { position: { x: 100, y: 0 } },
            position: { x: 100, y: 0 },
            dataRef: "step-a",
            requestRef: "step-a",
            config: { kind: "request", label: "Fetch status" },
          },
          {
            id: "cond-1",
            kind: "condition",
            geometry: { position: { x: 220, y: 0 } },
            position: { x: 220, y: 0 },
            config: {
              kind: "condition",
              label: "Status is 200",
              rules: [
                {
                  id: "rule-1",
                  valueRef: "req1.response.status",
                  operator: "equals",
                  value: "200",
                },
              ],
              expression: "",
            },
          },
          {
            id: "step-b",
            kind: "request",
            geometry: { position: { x: 360, y: -80 } },
            position: { x: 360, y: -80 },
            dataRef: "step-b",
            requestRef: "step-b",
            config: { kind: "request", label: "True branch" },
          },
          {
            id: "step-c",
            kind: "request",
            geometry: { position: { x: 360, y: 80 } },
            position: { x: 360, y: 80 },
            dataRef: "step-c",
            requestRef: "step-c",
            config: { kind: "request", label: "False branch" },
          },
        ],
        edges: [
          {
            id: "step-a:cond-1:control",
            source: "step-a",
            target: "cond-1",
            semantics: "control",
          },
          {
            id: "step-a:step-b:control",
            source: "step-a",
            target: "step-b",
            semantics: "control",
          },
          {
            id: "cond-1:true:step-b",
            source: "cond-1",
            target: "step-b",
            semantics: "true",
          },
          {
            id: "cond-1:false:step-c",
            source: "cond-1",
            target: "step-c",
            semantics: "false",
          },
        ],
      },
    };

    vi.mocked(executeRequest)
      .mockResolvedValueOnce({
        ...mockResponse,
        status: 200,
      })
      .mockImplementationOnce(async (request) => {
        expect(request.url).toBe("https://api.example.com/true");
        return mockResponse;
      });

    const generator = createPipelineGenerator(
      pipelineWithCondition,
      {},
      {
        abortControls: new Map(),
        masterAbort: new AbortController(),
        useStream: false,
      },
    );

    const eventTypes: string[] = [];
    let result = await generator.next();
    while (!result.done) {
      eventTypes.push(result.value.type);
      result = await generator.next();
    }

    expect(eventTypes).toContain("condition_evaluated");
    expect(executeRequest).toHaveBeenCalledTimes(2);
    expect(
      vi
        .mocked(executeRequest)
        .mock.calls.some(([request]) => request.url === "https://api.example.com/false"),
    ).toBe(false);
  });

  it("DebugController critical 8-step retry protocol", async () => {
    const { createDebugController } = await import("@/features/pipeline/debug-controller");
    const controller = createDebugController();
    type ControllerWithState = typeof controller & {
      __state: {
        currentStepIndex: number;
        pipeline: Pipeline | null;
        envVars: Record<string, string>;
        generator: AsyncGenerator<GeneratorYield> | null;
        runtimeVariables: Record<string, unknown>;
        snapshots: StepSnapshot[];
        status: string;
        originExecutionMode: "auto" | "debug";
        executionMode: "auto" | "debug";
      };
    };
    const controllerImpl = (controller as ControllerWithState).__state;
    controllerImpl.pipeline = mockPipeline;
    controllerImpl.envVars = {};
    controllerImpl.originExecutionMode = "debug";
    controllerImpl.executionMode = "auto";

    // Simulate a failure at step 1 (0-indexed)
    controllerImpl.snapshots = [
      {
        stepId: mockPipeline.steps[0].id,
        stepIndex: 0,
        stepName: "Step 1",
        entryType: "request" as const,
        method: "GET" as const,
        url: "https://api.example.com",
        resolvedRequest: {
          method: "GET" as const,
          url: "https://api.example.com",
          headers: {},
          body: null,
        },
        status: "success" as const,
        reducedResponse: {
          status: 200,
          statusText: "OK",
          latencyMs: 100,
          sizeBytes: 20,
          summary: {},
          headers: {},
        },
        fullBody: '{"message":"success"}',
        variables: { req1: { response: { body: "ok" } } },
        error: null,
        startedAt: null,
        completedAt: null,
        streamStatus: "idle" as const,
        streamChunks: [],
      },
      {
        stepId: "step-2",
        stepIndex: 1,
        stepName: "Step 2",
        entryType: "request" as const,
        method: "GET" as const,
        url: "",
        resolvedRequest: {
          method: "GET" as const,
          url: "",
          headers: {},
          body: null,
        },
        status: "error" as const,
        reducedResponse: null,
        variables: {},
        error: "Failed",
        startedAt: null,
        completedAt: null,
        streamStatus: "idle" as const,
        streamChunks: [],
      },
    ];
    controllerImpl.status = "error";

    vi.mocked(executeRequest).mockResolvedValue(mockResponse);

    // Use a slow generator mock to ensure we can check state before yields
    const mockYield: GeneratorYield = {
      type: "step_ready",
      snapshot: {} as StepSnapshot,
    };
    vi.mocked(createPipelineGenerator).mockImplementationOnce(() => {
      return (async function* (): AsyncGenerator<GeneratorYield> {
        await new Promise((resolve) => setTimeout(resolve, 50));
        yield mockYield;
      })();
    });

    const retryPromise = controller.retry();

    // Since retry() now delegates to a Web Worker asynchronously,
    // we need to flush promises to let the state transition to 'running'
    // before the mocked generator starts yielding.
    await new Promise(process.nextTick);

    // Verify intermediate state (Fix 6: Update store before starting generator loop)
    expect(controllerImpl.status).toBe("running");
    expect(controllerImpl.snapshots.length).toBe(1);
    expect(controllerImpl.currentStepIndex).toBe(1);

    await retryPromise;
    expect(controllerImpl.generator).not.toBeNull();
    expect(controllerImpl.runtimeVariables).toHaveProperty("req1");
    expect(controllerImpl.originExecutionMode).toBe("debug");
  });
});
