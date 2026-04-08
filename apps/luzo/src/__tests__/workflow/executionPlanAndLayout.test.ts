import { describe, expect, it } from "vitest";
import { compileExecutionPlan } from "@/features/workflow/compiler/compileExecutionPlan";
import type { RequestRegistry, WorkflowDefinition } from "@/types/workflow";

function createRegistry(): RequestRegistry {
  const baseRequest = {
    method: "GET" as const,
    url: "https://example.com",
    headers: [],
    params: [],
    body: null,
    bodyType: "none" as const,
    auth: { type: "none" as const },
  };

  return {
    kind: "request-registry",
    version: 1,
    id: "registry-1",
    createdAt: "2026-03-27T00:00:00.000Z",
    updatedAt: "2026-03-27T00:00:00.000Z",
    requests: {
      req1: { ...baseRequest, id: "req1", name: "Request 1", url: "https://example.com/1" },
      req2: { ...baseRequest, id: "req2", name: "Request 2", url: "https://example.com/2" },
      req3: { ...baseRequest, id: "req3", name: "Request 3", url: "https://example.com/3" },
    },
  };
}

function createWorkflow(edges: WorkflowDefinition["edges"]): WorkflowDefinition {
  return {
    kind: "workflow-definition",
    version: 1,
    id: "wf-1",
    name: "Branch Workflow",
    createdAt: "2026-03-27T00:00:00.000Z",
    updatedAt: "2026-03-27T00:00:00.000Z",
    requestRegistryId: "registry-1",
    entryNodeIds: ["req1"],
    nodes: [
      { id: "req1", kind: "request", requestRef: "req1" },
      { id: "req2", kind: "request", requestRef: "req2" },
      { id: "req3", kind: "request", requestRef: "req3" },
    ],
    edges,
  };
}

describe("execution plan compilation", () => {
  it("captures success and failure routes for request nodes", () => {
    const result = compileExecutionPlan({
      workflow: createWorkflow([
        { id: "success-edge", source: "req1", target: "req2", semantics: "success" },
        { id: "failure-edge", source: "req1", target: "req3", semantics: "failure" },
      ]),
      registry: createRegistry(),
    });

    expect(result.warnings).toEqual([]);
    expect(result.plan.nodes[0]?.routes).toEqual({
      control: [],
      success: ["req2"],
      failure: ["req3"],
      true: [],
      false: [],
    });
  });

  it("rejects duplicate success branches", () => {
    const result = compileExecutionPlan({
      workflow: createWorkflow([
        { id: "success-a", source: "req1", target: "req2", semantics: "success" },
        { id: "success-b", source: "req1", target: "req3", semantics: "success" },
      ]),
      registry: createRegistry(),
    });

    expect(
      result.warnings.some(
        (warning) => warning.field === "success" && warning.severity === "error",
      ),
    ).toBe(true);
  });

  it("marks condition nodes with both branch edges as branch-capable", () => {
    const registry = createRegistry();
    const result = compileExecutionPlan({
      workflow: {
        kind: "workflow-definition",
        version: 1,
        id: "wf-condition",
        name: "Condition Workflow",
        createdAt: "2026-03-27T00:00:00.000Z",
        updatedAt: "2026-03-27T00:00:00.000Z",
        requestRegistryId: "registry-1",
        entryNodeIds: ["req1"],
        nodes: [
          { id: "req1", kind: "request", requestRef: "req1" },
          {
            id: "cond1",
            kind: "condition",
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
          { id: "req2", kind: "request", requestRef: "req2" },
          { id: "req3", kind: "request", requestRef: "req3" },
        ],
        edges: [
          { id: "req1-cond1", source: "req1", target: "cond1", semantics: "control" },
          { id: "cond1-req2", source: "cond1", target: "req2", semantics: "true" },
          { id: "cond1-req3", source: "cond1", target: "req3", semantics: "false" },
        ],
      },
      registry,
    });

    expect(result.warnings).toEqual([]);
    expect(result.plan.nodes.find((node) => node.nodeId === "cond1")?.branch).toEqual({
      mode: "all",
    });
  });

  it("reports incomplete condition routing without the extra entry-node error", () => {
    const registry = createRegistry();
    const result = compileExecutionPlan({
      workflow: {
        kind: "workflow-definition",
        version: 1,
        id: "wf-condition-incomplete",
        name: "Condition Workflow Incomplete",
        createdAt: "2026-03-27T00:00:00.000Z",
        updatedAt: "2026-03-27T00:00:00.000Z",
        requestRegistryId: "registry-1",
        entryNodeIds: ["req1"],
        nodes: [
          { id: "req1", kind: "request", requestRef: "req1" },
          {
            id: "cond1",
            kind: "condition",
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
        ],
        edges: [{ id: "req1-cond1", source: "req1", target: "cond1", semantics: "control" }],
      },
      registry,
    });

    expect(
      result.warnings.filter(
        (warning) => warning.stepId === "cond1" && warning.severity === "error",
      ),
    ).toEqual([
      expect.objectContaining({
        field: "routing",
        message: 'Condition node "cond1" has no true or false edges',
      }),
    ]);
  });
});
