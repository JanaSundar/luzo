import { describe, expect, it, vi } from "vitest";
import { executeBatchRequestsThroughApiRoute } from "@/services/http/execute-route-client";
import { createPipelineGenerator } from "@/features/pipeline/generator-executor";
import { compileExecutionPlan } from "@/features/workflow/compiler/compileExecutionPlan";
import type { GraphWorkerApi } from "@/types/workers";
import type { Pipeline } from "@/types";

vi.mock("@/services/http/execute-route-client", () => ({
  executeBatchRequestsThroughApiRoute: vi.fn(),
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const baseResponse = {
  status: 200,
  statusText: "OK",
  headers: { "content-type": "application/json" },
  time: 10,
  size: 10,
};

describe("parallel pipeline execution", () => {
  it("starts independent auto-mode requests in the same stage concurrently", async () => {
    const batch = deferred<Array<typeof baseResponse & { body: string }>>();
    vi.mocked(executeBatchRequestsThroughApiRoute).mockImplementationOnce(
      async () => batch.promise,
    );

    const pipeline: Pipeline = {
      id: "pipeline-1",
      name: "Parallel pipeline",
      createdAt: "",
      updatedAt: "",
      narrativeConfig: { tone: "technical", prompt: "", enabled: true },
      steps: [
        {
          id: "step-a",
          name: "List users",
          method: "GET",
          url: "https://api.example.com/users",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
        {
          id: "step-b",
          name: "List teams",
          method: "GET",
          url: "https://api.example.com/teams",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
      ],
    };

    const generator = createPipelineGenerator(
      pipeline,
      {},
      {
        abortControls: new Map(),
        masterAbort: new AbortController(),
        useStream: false,
      },
    );

    expect((await generator.next()).value?.type).toBe("step_ready");
    expect((await generator.next()).value?.type).toBe("step_ready");

    const completion = generator.next();
    await Promise.resolve();

    expect(executeBatchRequestsThroughApiRoute).toHaveBeenCalledTimes(1);

    batch.resolve([
      { ...baseResponse, body: '{"id":1}' },
      { ...baseResponse, body: '{"id":2}' },
    ]);

    const yields = [];
    let result = await completion;
    while (!result.done) {
      yields.push(result.value.type);
      result = await generator.next();
    }

    expect(yields.filter((type) => type === "step_complete")).toHaveLength(2);
  });
});
