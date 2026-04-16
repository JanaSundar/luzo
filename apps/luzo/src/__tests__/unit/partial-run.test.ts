import { describe, expect, it } from "vitest";
import { planPartialPipelineRun } from "@/features/pipeline/partial-run";
import type { Pipeline } from "@/types";

describe("planPartialPipelineRun", () => {
  it("reuses prior upstream context when available", () => {
    const pipeline = makePipeline();

    const plan = planPartialPipelineRun({
      artifact: {
        generatedAt: "2026-04-15T00:00:00.000Z",
        pipelineStructureHash: "pipeline_hash",
        runtime: { mode: "partial-previous" },
        stepContextByAlias: {
          req1: {
            alias: "req1",
            payload: { response: { body: { token: "secret" } } },
            stepId: "step-1",
          },
        },
        steps: [{ stepId: "step-1" }],
      },
      mode: "partial-previous",
      pipeline,
      startStepId: "step-2",
    });

    expect(plan.valid).toBe(true);
    if (plan.valid) {
      expect(plan.options.startStepId).toBe("step-2");
      expect(plan.options.partialMode).toBe("partial-previous");
      expect(plan.options.reusedAliases).toContain("req1");
      expect(plan.options.initialRuntimeVariables).toMatchObject({
        req1: { response: { body: { token: "secret" } } },
      });
    }
  });

  it("blocks reuse when required upstream context is missing", () => {
    const plan = planPartialPipelineRun({
      artifact: {
        generatedAt: "2026-04-15T00:00:00.000Z",
        pipelineStructureHash: "pipeline_hash",
        runtime: { mode: "partial-previous" },
        stepContextByAlias: {},
        steps: [{ stepId: "step-1" }],
      },
      mode: "partial-previous",
      pipeline: makePipeline(),
      startStepId: "step-2",
    });

    expect(plan.valid).toBe(false);
    if (!plan.valid) {
      expect(plan.error).toMatch(/requires data from/i);
      expect(plan.error).toMatch(/Login/);
    }
  });

  it("allows fresh execution only when no upstream context is required", () => {
    const pipeline = makePipeline();

    const rootPlan = planPartialPipelineRun({
      artifact: null,
      mode: "partial-fresh",
      pipeline,
      startStepId: "step-1",
    });
    expect(rootPlan.valid).toBe(true);

    const dependentPlan = planPartialPipelineRun({
      artifact: null,
      mode: "partial-fresh",
      pipeline,
      startStepId: "step-2",
    });
    expect(dependentPlan.valid).toBe(false);
    if (!dependentPlan.valid) {
      expect(dependentPlan.error).toMatch(/requires previous data/i);
    }
  });

  it("surfaces a stale prior-context warning when the saved artifact is old", () => {
    const plan = planPartialPipelineRun({
      artifact: {
        generatedAt: "2020-01-01T00:00:00.000Z",
        pipelineStructureHash: "pipeline_hash",
        runtime: { mode: "partial-previous" },
        stepContextByAlias: {
          req1: {
            alias: "req1",
            payload: { response: { body: { token: "secret" } } },
            stepId: "step-1",
          },
        },
        steps: [{ stepId: "step-1" }],
      },
      mode: "partial-previous",
      pipeline: makePipeline(),
      startStepId: "step-2",
    });

    expect(plan.valid).toBe(true);
    if (plan.valid) {
      expect(plan.options.staleContextWarning).toMatch(/using previous execution context/i);
    }
  });
});

function makePipeline(): Pipeline {
  return {
    createdAt: "2026-04-15T00:00:00.000Z",
    id: "pipeline-1",
    name: "Pipeline",
    narrativeConfig: { enabled: true, prompt: "", tone: "technical" },
    steps: [
      {
        auth: { type: "none" },
        body: null,
        bodyType: "none",
        headers: [],
        id: "step-1",
        method: "POST",
        name: "Login",
        params: [],
        url: "https://api.example.com/auth",
      },
      {
        auth: { bearer: { token: "{{req1.response.body.token}}" }, type: "bearer" },
        body: null,
        bodyType: "none",
        headers: [],
        id: "step-2",
        method: "GET",
        name: "Profile",
        params: [],
        url: "https://api.example.com/me",
      },
    ],
    updatedAt: "2026-04-15T00:00:00.000Z",
  };
}
