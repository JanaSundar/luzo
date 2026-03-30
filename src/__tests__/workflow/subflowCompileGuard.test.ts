import { describe, expect, it } from "vitest";
import { compileExecutionPlan } from "@/features/workflow/compiler/compileExecutionPlan";
import type { RequestRegistry, WorkflowDefinition } from "@/types/workflow";

describe("subflow compile guard", () => {
  it("rejects subflow nodes until compile-time expansion is implemented", () => {
    const workflow: WorkflowDefinition = {
      kind: "workflow-definition",
      version: 1,
      id: "wf-1",
      name: "Subflow Guard",
      entryNodeIds: ["subflow-1"],
      requestRegistryId: "registry-1",
      nodes: [
        {
          id: "subflow-1",
          kind: "subflow",
          config: {
            kind: "subflow",
            label: "Auth Subflow",
            subflowId: "auth",
            subflowVersion: 1,
            inputBindings: {},
            outputAliases: {},
          },
        },
      ],
      edges: [],
    };
    const registry: RequestRegistry = {
      kind: "request-registry",
      version: 1,
      id: "registry-1",
      requests: {},
    };

    const result = compileExecutionPlan({ workflow, registry });

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stepId: "subflow-1",
          field: "subflow",
          severity: "error",
        }),
      ]),
    );
  });
});
