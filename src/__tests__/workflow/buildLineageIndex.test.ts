import { describe, expect, it } from "vitest";
import { buildWorkflowBundleFromPipeline } from "@/features/workflow/pipeline-adapters";
import { buildLineageIndex } from "@/features/workflow/analysis/buildLineageIndex";
import type { Pipeline } from "@/types";

function createPipeline(): Pipeline {
  return {
    id: "pipe-1",
    name: "Lineage Test",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    narrativeConfig: {
      tone: "technical",
      prompt: "",
      enabled: false,
      length: "medium",
      promptOverrides: undefined,
    },
    steps: [
      {
        id: "step-login",
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
        id: "step-me",
        name: "Get Me",
        method: "GET",
        url: "https://api.example.com/me",
        headers: [
          {
            key: "Authorization",
            value: "Bearer {{req1.response.body.token}}",
            enabled: true,
          },
        ],
        params: [],
        body: null,
        bodyType: "none",
        auth: { type: "none" },
      },
      {
        id: "step-forward",
        name: "Forward Ref",
        method: "GET",
        url: "https://api.example.com/users/{{req4.response.body.id}}",
        headers: [],
        params: [],
        body: null,
        bodyType: "none",
        auth: { type: "none" },
      },
      {
        id: "step-invalid",
        name: "Invalid Path",
        method: "GET",
        url: "https://api.example.com/audit",
        headers: [
          {
            key: "X-Trace",
            value: "{{req1.response.body.missing}}",
            enabled: true,
          },
        ],
        params: [],
        body: null,
        bodyType: "none",
        auth: { type: "none" },
      },
    ],
  };
}

describe("buildLineageIndex", () => {
  it("builds resolved, forward, and invalid lineage states", () => {
    const pipeline = createPipeline();
    const bundle = buildWorkflowBundleFromPipeline(pipeline);

    const result = buildLineageIndex({
      workflow: bundle.workflow,
      registry: bundle.registry,
      executionContext: {
        req1: {
          response: {
            status: 200,
            body: {
              token: "secret-token",
            },
          },
        },
      },
    });

    expect(result.edges).toHaveLength(3);
    expect(result.consumersBySourceStep["step-login"]).toEqual(["step-invalid", "step-me"]);
    expect(result.producersByDependentStep["step-me"]).toEqual(["step-login"]);
    expect(result.riskByStep["step-login"]).toMatchObject({
      outgoingCount: 2,
      riskyCount: 1,
    });

    const resolved = result.edges.find((edge) => edge.consumerStepId === "step-me");
    expect(resolved).toMatchObject({
      resolutionStatus: "resolved",
      sourceStepId: "step-login",
      referencedPath: "response.body.token",
    });

    const forward = result.edges.find((edge) => edge.consumerStepId === "step-forward");
    expect(forward?.resolutionStatus).toBe("forward_reference");

    const invalid = result.edges.find((edge) => edge.consumerStepId === "step-invalid");
    expect(invalid?.resolutionStatus).toBe("unresolved_path");
  });

  it("marks deep body references as runtime_only when no execution context exists", () => {
    const pipeline = createPipeline();
    const bundle = buildWorkflowBundleFromPipeline(pipeline);

    const result = buildLineageIndex({
      workflow: bundle.workflow,
      registry: bundle.registry,
    });

    const edge = result.edges.find((entry) => entry.consumerStepId === "step-me");
    expect(edge?.resolutionStatus).toBe("runtime_only");
    expect(result.byUnresolvedState.runtime_only).toContain(edge?.id);
  });
});
