import { describe, expect, it, vi } from "vitest";
import { executeRequest } from "@/app/actions/api-tests";
import { executeRequestStream } from "@/lib/http/client";
import {
  type GeneratorExecutorModule,
  createPipelineGenerator,
} from "@/lib/pipeline/generator-executor";
import type { Pipeline } from "@/types";
import type { GeneratorYield, StepAbortControl, StepSnapshot } from "@/types/pipeline-runtime";

vi.mock("@/app/actions/api-tests", () => ({
  executeRequest: vi.fn(),
}));

vi.mock("@/lib/http/client", () => ({
  executeRequestStream: vi.fn(),
}));

vi.mock("@/lib/pipeline/generator-executor", async (importOriginal) => {
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
    expect(types).toContain("step_complete");
    expect(types).not.toContain("stream_chunk");

    // Verify final snapshot consistency
    const lastYield = yields[yields.length - 1];
    expect(lastYield?.type).toBe("step_complete");
    expect(lastYield?.snapshot.status).toBe("success");
    expect(
      (lastYield?.snapshot.variables.req1 as { response: { body: string } }).response.body,
    ).toEqual({
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
    expect(types).toContain("stream_chunk");
    expect(types).toContain("step_complete");

    // Verify stream chunks were collected
    const streamYields = yields.filter((y) => y.type === "stream_chunk");
    expect(streamYields.length).toBeGreaterThan(0);

    // Verify final snapshot consistency is identical to normal execution
    const lastYield = yields[yields.length - 1];
    expect(lastYield?.type).toBe("step_complete");
    expect(lastYield?.snapshot.status).toBe("success");
    expect(
      (lastYield?.snapshot.variables.req1 as { response: { body: string } }).response.body,
    ).toEqual({
      message: "success",
    });
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
      if (result.value.type === "step_complete") {
        expect(result.value.snapshot.resolvedRequest.url).toBe("https://api.example.com?foo=bar");
        expect(result.value.snapshot.resolvedRequest.method).toBe("GET");
      }
      result = await generator.next();
    }
  });

  it("DebugController critical 8-step retry protocol", async () => {
    const { createDebugController } = await import("@/lib/pipeline/debug-controller");
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
      };
    };
    const controllerImpl = (controller as ControllerWithState).__state;
    controllerImpl.pipeline = mockPipeline;
    controllerImpl.envVars = {};

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
      allSnapshots: [] as StepSnapshot[],
    };
    vi.mocked(createPipelineGenerator).mockImplementationOnce(() => {
      return (async function* (): AsyncGenerator<GeneratorYield> {
        await new Promise((resolve) => setTimeout(resolve, 50));
        yield mockYield;
      })();
    });

    const retryPromise = controller.retry();

    // Verify intermediate state (Fix 6: Update store before starting generator loop)
    expect(controllerImpl.status).toBe("running");
    expect(controllerImpl.snapshots.length).toBe(1);
    expect(controllerImpl.currentStepIndex).toBe(1);

    await retryPromise;
    expect(controllerImpl.generator).not.toBeNull();
    expect(controllerImpl.runtimeVariables).toHaveProperty("req1");
  });
});
