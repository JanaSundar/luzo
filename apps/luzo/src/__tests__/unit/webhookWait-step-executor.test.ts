import { describe, expect, it, vi } from "vitest";
import type { StepAlias } from "@/types/pipeline-runtime";
import { executeWebhookWaitGenerator } from "@/features/pipeline/webhookWait-step-executor";
import { createWebhookWait, readWebhookWait } from "@/features/pipeline/webhook-wait-client";

vi.mock("@/stores/useSettingsStore", () => ({
  useSettingsStore: {
    getState: () => ({ dbUrl: "postgres://runtime-db" }),
  },
}));

vi.mock("@/features/pipeline/webhook-wait-client", () => ({
  createWebhookWait: vi.fn().mockResolvedValue({
    wait: {
      id: "wait-1",
      endpointId: "exec-1:wait-node",
      endpointToken: "token-1",
      endpointUrl: "https://example.com/webhook/1",
      status: "waiting",
    },
  }),
  readWebhookWait: vi.fn().mockResolvedValue({
    wait: {
      id: "wait-1",
      endpointId: "exec-1:wait-node",
      endpointToken: "token-1",
      endpointUrl: "https://example.com/webhook/1",
      status: "matched",
      matchedPayload: { token: "abc" },
      matchedEventId: "event-1",
    },
  }),
}));

vi.mock("@/features/pipeline/async-step-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/pipeline/async-step-runtime")>();
  return {
    ...actual,
    createWebhookEndpointUrl: vi.fn(() => "https://example.com/webhook/1"),
    sleepWithAbort: vi.fn().mockResolvedValue(undefined),
  };
});

describe("webhookWait-step-executor", () => {
  it("stores webhook runtime data under webhookN refs instead of raw id paths", async () => {
    const runtimeVariables: Record<string, unknown> = {};
    const snapshots = [];
    const webhookAlias: StepAlias = {
      stepId: "wait-node",
      alias: "webhook1",
      index: 1,
      refs: ["webhook1", "req2", "wait-node"],
    };

    const generator = executeWebhookWaitGenerator({
      nodeId: "wait-node",
      orderIndex: 1,
      webhookAlias,
      webhookWaitConfig: {
        kind: "webhookWait",
        label: "Wait for callback",
        correlationKey: "order.id",
        timeoutMs: 30_000,
      },
      runtimeVariables,
      snapshots,
      executionId: "exec-1",
      masterAbort: new AbortController(),
    });

    let completedRuntimeVariables: Record<string, unknown> | null = null;
    let result = await generator.next();
    while (!result.done) {
      if (result.value.type === "step_completed") {
        completedRuntimeVariables = result.value.runtimeVariables;
      }
      result = await generator.next();
    }

    expect(createWebhookWait).toHaveBeenCalledTimes(1);
    expect(readWebhookWait).toHaveBeenCalledTimes(1);
    expect(completedRuntimeVariables).toMatchObject({
      webhook1: {
        webhookUrl: "https://example.com/webhook/1",
        output: { token: "abc" },
        payload: { token: "abc" },
      },
      "wait-node": {
        webhookUrl: "https://example.com/webhook/1",
        output: { token: "abc" },
        payload: { token: "abc" },
      },
    });
    expect(completedRuntimeVariables?.["wait-node.payload"]).toBeUndefined();
  });
});
