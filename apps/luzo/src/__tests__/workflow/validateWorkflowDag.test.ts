import { describe, expect, it } from "vitest";
import { validateWorkflowDag } from "@/features/workflow/validation/validateWorkflowDag";
import type { WorkflowDefinition } from "@/types/workflow";

function createWorkflow(edges: WorkflowDefinition["edges"]): WorkflowDefinition {
  return {
    kind: "workflow-definition",
    version: 1,
    id: "wf-1",
    name: "Test Workflow",
    requestRegistryId: "registry-1",
    entryNodeIds: ["start"],
    nodes: [
      { id: "start", kind: "start" },
      { id: "req-a", kind: "request", requestRef: "req-a" },
      { id: "req-b", kind: "request", requestRef: "req-b" },
      { id: "end", kind: "end" },
    ],
    edges,
  };
}

describe("validateWorkflowDag", () => {
  it("derives deterministic order and stages", () => {
    const result = validateWorkflowDag(
      createWorkflow([
        { id: "e1", source: "start", target: "req-a", semantics: "control" },
        { id: "e2", source: "req-a", target: "req-b", semantics: "control" },
        { id: "e3", source: "req-b", target: "end", semantics: "control" },
      ]),
    );

    expect(result.valid).toBe(true);
    expect(result.order).toEqual(["start", "req-a", "req-b", "end"]);
    expect(result.stages).toEqual([["start"], ["req-a"], ["req-b"], ["end"]]);
  });

  it("flags cycles", () => {
    const result = validateWorkflowDag(
      createWorkflow([
        { id: "e1", source: "start", target: "req-a", semantics: "control" },
        { id: "e2", source: "req-a", target: "req-b", semantics: "control" },
        { id: "e3", source: "req-b", target: "req-a", semantics: "control" },
      ]),
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.message.includes("Cycle"))).toBe(true);
  });
});
