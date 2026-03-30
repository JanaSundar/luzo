import { describe, expect, it } from "vitest";
import { compileExecutionPlan } from "@/features/workflow/compiler/compileExecutionPlan";
import type { RequestRegistry, SubflowDefinition, WorkflowDefinition } from "@/types/workflow";

describe("subflow compilation", () => {
  it("expands a subflow node into executable request nodes", () => {
    const workflow: WorkflowDefinition = {
      kind: "workflow-definition",
      version: 1,
      id: "wf-1",
      name: "Subflow Expansion",
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
            outputAliases: { response: "auth" },
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
    const subflowDefinitions: SubflowDefinition[] = [
      {
        id: "auth",
        name: "Auth",
        version: 1,
        description: "Login flow",
        workflow: {
          kind: "workflow-definition",
          version: 1,
          id: "auth-workflow",
          name: "Auth",
          entryNodeIds: ["login-request"],
          requestRegistryId: "auth-registry",
          nodes: [
            {
              id: "login-request",
              kind: "request",
              requestRef: "login-request",
              configRef: "login-request",
              config: { kind: "request", label: "Login" },
            },
          ],
          edges: [],
        },
        registry: {
          kind: "request-registry",
          version: 1,
          id: "auth-registry",
          requests: {
            "login-request": {
              id: "login-request",
              name: "Login",
              method: "POST",
              url: "https://example.com/login",
              headers: [],
              params: [],
              body: "{}",
              bodyType: "json",
              auth: { type: "none" },
            },
          },
        },
        inputSchema: [],
        outputSchema: [{ key: "response", label: "Response", path: "login-request" }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const result = compileExecutionPlan({ workflow, registry, subflowDefinitions });

    expect(result.warnings.filter((warning) => warning.severity === "error")).toHaveLength(0);
    expect(result.plan.nodes).toHaveLength(1);
    expect(result.plan.nodes[0]?.kind).toBe("request");
    expect(result.plan.nodes[0]?.origin?.subflowInstanceId).toBe("subflow-1");
    expect(result.aliases[0]?.refs).toContain("auth");
  });
});
