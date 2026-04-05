import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeRequest } from "@/app/actions/api-tests";
import { executeRequestStream } from "@/lib/http/client";
import { createFlowDocumentFromSteps } from "@/features/flow-editor/domain/flow-document";
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
      outputText?: string;
    };
  };
}

vi.mock("@/app/actions/api-tests", () => ({
  executeRequest: vi.fn(),
}));

vi.mock("@/services/http/client", () => ({
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
  flow: createFlowDocumentFromSteps([
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
  ]),
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

  it("extracts outputText for AI steps so downstream nodes can reference plain text", async () => {
    vi.mocked(executeRequest).mockResolvedValue({
      ...mockResponse,
      body: JSON.stringify({
        choices: [{ message: { content: "token-123" } }],
      }),
    });

    const aiPipeline: Pipeline = {
      ...mockPipeline,
      steps: [
        {
          id: "ai-step-1",
          name: "Generate token",
          stepType: "ai",
          url: "https://api.openai.com/v1/chat/completions",
          method: "POST",
          headers: [{ enabled: true, key: "Content-Type", value: "application/json" }],
          params: [],
          body: '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Return only a token"}]}',
          bodyType: "json",
          auth: { type: "bearer", bearer: { token: "{{__luzo_ai_openai_api_key}}" } },
        },
      ],
    };

    const generator = createPipelineGenerator(
      aiPipeline,
      { __luzo_ai_openai_api_key: "secret-key" },
      {
        abortControls: new Map(),
        masterAbort: new AbortController(),
        useStream: false,
      },
    );

    let result = await generator.next();
    while (!result.done) {
      if (result.value.type === "step_complete") {
        const variables = result.value.snapshot.variables as unknown as MockStepVariables;
        expect(variables.req1.response.outputText).toBe("token-123");
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

  it("executes only the false branch when an evaluate expression resolves false", async () => {
    vi.mocked(executeRequest).mockReset();

    const conditionalPipeline: Pipeline = {
      ...mockPipeline,
      flow: {
        version: 1,
        blocks: [
          { id: "flow-start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
          {
            id: "step-1",
            type: "request",
            position: { x: 120, y: 0 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Fetch users",
              params: [],
              url: "https://api.example.com/users",
            },
          },
          {
            id: "condition-1",
            type: "evaluate",
            position: { x: 280, y: 0 },
            data: {
              label: "Check first user",
              conditionType: "if",
              expression: "req1.response.body.users[0]?.id === 2",
            },
          },
          {
            id: "step-2",
            type: "request",
            position: { x: 440, y: -80 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "True branch",
              params: [],
              url: "https://api.example.com/true",
            },
          },
          {
            id: "step-3",
            type: "request",
            position: { x: 440, y: 80 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "False branch",
              params: [],
              url: "https://api.example.com/false",
            },
          },
        ],
        connections: [
          {
            id: "start-step-1",
            sourceBlockId: "flow-start",
            targetBlockId: "step-1",
            sourceHandleId: "output",
            targetHandleId: "input",
            kind: "control",
          },
          {
            id: "step-1-condition",
            sourceBlockId: "step-1",
            targetBlockId: "condition-1",
            sourceHandleId: "success",
            targetHandleId: "input",
            kind: "control",
          },
          {
            id: "route-true",
            sourceBlockId: "condition-1",
            targetBlockId: "step-2",
            sourceHandleId: "true",
            targetHandleId: "input",
            kind: "conditional",
          },
          {
            id: "route-false",
            sourceBlockId: "condition-1",
            targetBlockId: "step-3",
            sourceHandleId: "false",
            targetHandleId: "input",
            kind: "conditional",
          },
        ],
      },
      steps: [
        {
          id: "step-1",
          name: "Fetch users",
          url: "https://api.example.com/users",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-2",
          name: "True branch",
          url: "https://api.example.com/true",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-3",
          name: "False branch",
          url: "https://api.example.com/false",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
      ],
    };

    vi.mocked(executeRequest)
      .mockResolvedValueOnce({
        ...mockResponse,
        body: JSON.stringify({ users: [{ id: 1 }] }),
      })
      .mockResolvedValueOnce(mockResponse);

    const yields: GeneratorYield[] = [];
    const generator = createPipelineGenerator(
      conditionalPipeline,
      {},
      {
        abortControls: new Map(),
        masterAbort: new AbortController(),
        useStream: false,
      },
    );

    let result = await generator.next();
    while (!result.done) {
      yields.push(result.value);
      result = await generator.next();
    }

    expect(executeRequest).toHaveBeenCalledTimes(2);
    expect(vi.mocked(executeRequest).mock.calls[1]?.[0].url).toBe("https://api.example.com/false");

    const conditionSnapshot = yields.find(
      (entry) => entry.type === "step_complete" && entry.snapshot.entryType === "condition",
    )?.snapshot;

    expect(conditionSnapshot?.conditionDecision?.result).toBe(false);
    expect(conditionSnapshot?.conditionDecision?.chosenHandleId).toBe("false");
    expect(conditionSnapshot?.conditionDecision?.chosenRouteId).toBe("route-false");
  });

  it("does not run a generic output edge alongside explicit success/fail request routes", async () => {
    vi.mocked(executeRequest).mockReset();

    const routedPipeline: Pipeline = {
      ...mockPipeline,
      flow: {
        version: 1,
        blocks: [
          { id: "flow-start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
          {
            id: "step-1",
            type: "request",
            position: { x: 120, y: 0 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Main request",
              params: [],
              url: "https://api.example.com/main",
            },
          },
          {
            id: "step-success",
            type: "request",
            position: { x: 360, y: -120 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Success branch",
              params: [],
              url: "https://api.example.com/success",
            },
          },
          {
            id: "step-fail",
            type: "request",
            position: { x: 360, y: 0 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Fail branch",
              params: [],
              url: "https://api.example.com/fail",
            },
          },
          {
            id: "step-generic",
            type: "request",
            position: { x: 360, y: 120 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Generic branch",
              params: [],
              url: "https://api.example.com/generic",
            },
          },
        ],
        connections: [
          {
            id: "start-step-1",
            sourceBlockId: "flow-start",
            targetBlockId: "step-1",
            sourceHandleId: "output",
            targetHandleId: "input",
            kind: "control",
          },
          {
            id: "step-1-success",
            sourceBlockId: "step-1",
            targetBlockId: "step-success",
            sourceHandleId: "success",
            targetHandleId: "input",
            kind: "control",
          },
          {
            id: "step-1-fail",
            sourceBlockId: "step-1",
            targetBlockId: "step-fail",
            sourceHandleId: "fail",
            targetHandleId: "input",
            kind: "control",
          },
          {
            id: "step-1-output",
            sourceBlockId: "step-1",
            targetBlockId: "step-generic",
            sourceHandleId: "output",
            targetHandleId: "input",
            kind: "control",
          },
        ],
      },
      steps: [
        {
          id: "step-1",
          name: "Main request",
          url: "https://api.example.com/main",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-success",
          name: "Success branch",
          url: "https://api.example.com/success",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-fail",
          name: "Fail branch",
          url: "https://api.example.com/fail",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-generic",
          name: "Generic branch",
          url: "https://api.example.com/generic",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
      ],
    };

    vi.mocked(executeRequest)
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce(mockResponse);

    const yields: GeneratorYield[] = [];
    const generator = createPipelineGenerator(
      routedPipeline,
      {},
      {
        abortControls: new Map(),
        masterAbort: new AbortController(),
        useStream: false,
      },
    );

    let result = await generator.next();
    while (!result.done) {
      yields.push(result.value);
      result = await generator.next();
    }

    expect(executeRequest).toHaveBeenCalledTimes(2);
    expect(vi.mocked(executeRequest).mock.calls[0]?.[0].url).toBe("https://api.example.com/main");
    expect(vi.mocked(executeRequest).mock.calls[1]?.[0].url).toBe(
      "https://api.example.com/success",
    );

    const completedRequestIds = yields
      .filter((entry) => entry.type === "step_complete" && entry.snapshot.entryType === "request")
      .map((entry) => entry.snapshot.stepId);

    expect(completedRequestIds).toContain("step-success");
    expect(completedRequestIds).not.toContain("step-fail");
    expect(completedRequestIds).not.toContain("step-generic");
  });

  it("runs only the fail route when a request completes with an error status", async () => {
    vi.mocked(executeRequest).mockReset();

    const routedPipeline: Pipeline = {
      ...mockPipeline,
      flow: {
        version: 1,
        blocks: [
          { id: "flow-start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
          {
            id: "step-1",
            type: "request",
            position: { x: 120, y: 0 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Main request",
              params: [],
              url: "https://api.example.com/main",
            },
          },
          {
            id: "step-success",
            type: "request",
            position: { x: 360, y: -120 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Success branch",
              params: [],
              url: "https://api.example.com/success",
            },
          },
          {
            id: "step-fail",
            type: "request",
            position: { x: 360, y: 0 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Fail branch",
              params: [],
              url: "https://api.example.com/fail",
            },
          },
          {
            id: "step-generic",
            type: "request",
            position: { x: 360, y: 120 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Generic branch",
              params: [],
              url: "https://api.example.com/generic",
            },
          },
        ],
        connections: [
          {
            id: "start-step-1",
            sourceBlockId: "flow-start",
            targetBlockId: "step-1",
            sourceHandleId: "output",
            targetHandleId: "input",
            kind: "control",
          },
          {
            id: "step-1-success",
            sourceBlockId: "step-1",
            targetBlockId: "step-success",
            sourceHandleId: "success",
            targetHandleId: "input",
            kind: "control",
          },
          {
            id: "step-1-fail",
            sourceBlockId: "step-1",
            targetBlockId: "step-fail",
            sourceHandleId: "fail",
            targetHandleId: "input",
            kind: "control",
          },
          {
            id: "step-1-output",
            sourceBlockId: "step-1",
            targetBlockId: "step-generic",
            sourceHandleId: "output",
            targetHandleId: "input",
            kind: "control",
          },
        ],
      },
      steps: [
        {
          id: "step-1",
          name: "Main request",
          url: "https://api.example.com/main",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-success",
          name: "Success branch",
          url: "https://api.example.com/success",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-fail",
          name: "Fail branch",
          url: "https://api.example.com/fail",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-generic",
          name: "Generic branch",
          url: "https://api.example.com/generic",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
      ],
    };

    vi.mocked(executeRequest)
      .mockResolvedValueOnce({
        ...mockResponse,
        status: 500,
        statusText: "Internal Server Error",
        body: '{"message":"failure"}',
      })
      .mockResolvedValueOnce(mockResponse);

    const yields: GeneratorYield[] = [];
    const generator = createPipelineGenerator(
      routedPipeline,
      {},
      {
        abortControls: new Map(),
        masterAbort: new AbortController(),
        useStream: false,
      },
    );

    let result = await generator.next();
    while (!result.done) {
      yields.push(result.value);
      result = await generator.next();
    }

    expect(executeRequest).toHaveBeenCalledTimes(2);
    expect(vi.mocked(executeRequest).mock.calls[0]?.[0].url).toBe("https://api.example.com/main");
    expect(vi.mocked(executeRequest).mock.calls[1]?.[0].url).toBe("https://api.example.com/fail");

    const completedRequestIds = yields
      .filter((entry) => entry.type === "step_complete" && entry.snapshot.entryType === "request")
      .map((entry) => entry.snapshot.stepId);

    expect(completedRequestIds).toContain("step-fail");
    expect(completedRequestIds).not.toContain("step-success");
    expect(completedRequestIds).not.toContain("step-generic");
  });

  it("runs only the fail route when a request throws", async () => {
    vi.mocked(executeRequest).mockReset();

    const routedPipeline: Pipeline = {
      ...mockPipeline,
      flow: {
        version: 1,
        blocks: [
          { id: "flow-start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
          {
            id: "step-1",
            type: "request",
            position: { x: 120, y: 0 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Main request",
              params: [],
              url: "https://api.example.com/main",
            },
          },
          {
            id: "step-success",
            type: "request",
            position: { x: 360, y: -120 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Success branch",
              params: [],
              url: "https://api.example.com/success",
            },
          },
          {
            id: "step-fail",
            type: "request",
            position: { x: 360, y: 0 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Fail branch",
              params: [],
              url: "https://api.example.com/fail",
            },
          },
          {
            id: "step-generic",
            type: "request",
            position: { x: 360, y: 120 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Generic branch",
              params: [],
              url: "https://api.example.com/generic",
            },
          },
        ],
        connections: [
          {
            id: "start-step-1",
            sourceBlockId: "flow-start",
            targetBlockId: "step-1",
            sourceHandleId: "output",
            targetHandleId: "input",
            kind: "control",
          },
          {
            id: "step-1-success",
            sourceBlockId: "step-1",
            targetBlockId: "step-success",
            sourceHandleId: "success",
            targetHandleId: "input",
            kind: "control",
          },
          {
            id: "step-1-fail",
            sourceBlockId: "step-1",
            targetBlockId: "step-fail",
            sourceHandleId: "fail",
            targetHandleId: "input",
            kind: "control",
          },
          {
            id: "step-1-output",
            sourceBlockId: "step-1",
            targetBlockId: "step-generic",
            sourceHandleId: "output",
            targetHandleId: "input",
            kind: "control",
          },
        ],
      },
      steps: [
        {
          id: "step-1",
          name: "Main request",
          url: "https://api.example.com/main",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-success",
          name: "Success branch",
          url: "https://api.example.com/success",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-fail",
          name: "Fail branch",
          url: "https://api.example.com/fail",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-generic",
          name: "Generic branch",
          url: "https://api.example.com/generic",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
      ],
    };

    vi.mocked(executeRequest)
      .mockRejectedValueOnce(new Error("Request failed"))
      .mockResolvedValueOnce(mockResponse);

    const yields: GeneratorYield[] = [];
    const generator = createPipelineGenerator(
      routedPipeline,
      {},
      {
        abortControls: new Map(),
        masterAbort: new AbortController(),
        useStream: false,
      },
    );

    let result = await generator.next();
    while (!result.done) {
      yields.push(result.value);
      result = await generator.next();
    }

    expect(executeRequest).toHaveBeenCalledTimes(2);
    expect(vi.mocked(executeRequest).mock.calls[0]?.[0].url).toBe("https://api.example.com/main");
    expect(vi.mocked(executeRequest).mock.calls[1]?.[0].url).toBe("https://api.example.com/fail");

    const completedRequestIds = yields
      .filter((entry) => entry.type === "step_complete" && entry.snapshot.entryType === "request")
      .map((entry) => entry.snapshot.stepId);

    expect(completedRequestIds).toContain("step-fail");
    expect(completedRequestIds).not.toContain("step-success");
    expect(completedRequestIds).not.toContain("step-generic");
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

  it("keeps the controller in error state after a failed run finishes", async () => {
    const { createDebugController } = await import("@/lib/pipeline/debug-controller");
    const controller = createDebugController();
    type ControllerWithState = typeof controller & {
      __state: {
        status: string;
      };
    };

    const failedSnapshot = {
      stepId: mockPipeline.steps[0]!.id,
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
      status: "error" as const,
      reducedResponse: null,
      variables: {},
      error: "Request failed",
      startedAt: null,
      completedAt: null,
      streamStatus: "idle" as const,
      streamChunks: [],
    } satisfies StepSnapshot;

    vi.mocked(createPipelineGenerator).mockImplementationOnce(() => {
      return (async function* (): AsyncGenerator<GeneratorYield> {
        yield {
          type: "error",
          snapshot: failedSnapshot,
          allSnapshots: [failedSnapshot],
        };
      })();
    });

    const result = controller.start(mockPipeline, {}, { executionMode: "auto" });
    expect(result.valid).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((controller as ControllerWithState).__state.status).toBe("error");
  });

  it("does not finalize the same failed node twice when it yields step_complete and error", async () => {
    vi.mocked(executeRequest).mockReset();

    const routedPipeline: Pipeline = {
      ...mockPipeline,
      flow: {
        version: 1,
        blocks: [
          { id: "flow-start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
          {
            id: "step-1",
            type: "request",
            position: { x: 120, y: 0 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Main request",
              params: [],
              url: "https://api.example.com/main",
            },
          },
          {
            id: "step-success",
            type: "request",
            position: { x: 360, y: -120 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Success branch",
              params: [],
              url: "https://api.example.com/success",
            },
          },
          {
            id: "step-fail",
            type: "request",
            position: { x: 360, y: 0 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Fail branch",
              params: [],
              url: "https://api.example.com/fail",
            },
          },
        ],
        connections: [
          {
            id: "start-step-1",
            sourceBlockId: "flow-start",
            targetBlockId: "step-1",
            sourceHandleId: "output",
            targetHandleId: "input",
            kind: "control",
          },
          {
            id: "step-1-success",
            sourceBlockId: "step-1",
            targetBlockId: "step-success",
            sourceHandleId: "success",
            targetHandleId: "input",
            kind: "control",
          },
          {
            id: "step-1-fail",
            sourceBlockId: "step-1",
            targetBlockId: "step-fail",
            sourceHandleId: "fail",
            targetHandleId: "input",
            kind: "control",
          },
        ],
      },
      steps: [
        {
          id: "step-1",
          name: "Main request",
          url: "https://api.example.com/main",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-success",
          name: "Success branch",
          url: "https://api.example.com/success",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-fail",
          name: "Fail branch",
          url: "https://api.example.com/fail",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
      ],
    };

    vi.mocked(executeRequest)
      .mockRejectedValueOnce(new Error("Request failed"))
      .mockResolvedValueOnce(mockResponse);

    const yields: GeneratorYield[] = [];
    const generator = createPipelineGenerator(
      routedPipeline,
      {},
      {
        abortControls: new Map(),
        masterAbort: new AbortController(),
        useStream: false,
      },
    );

    let result = await generator.next();
    while (!result.done) {
      yields.push(result.value);
      result = await generator.next();
    }

    const mainRequestEvents = yields.filter((entry) => entry.snapshot.stepId === "step-1");
    expect(mainRequestEvents.filter((entry) => entry.type === "step_complete")).toHaveLength(1);
    expect(mainRequestEvents.filter((entry) => entry.type === "error")).toHaveLength(1);

    expect(executeRequest).toHaveBeenCalledTimes(2);
    expect(vi.mocked(executeRequest).mock.calls[1]?.[0].url).toBe("https://api.example.com/fail");
  });
});
