import { describe, expect, it } from "vitest";
import { createPipelineRecord } from "@/features/pipeline/createPipelineRecord";
import {
  createFlowNodeRecord,
  ensurePipelineFlowDocument,
  getPipelineExecutionSupport,
} from "@/features/pipeline/canvas-flow";

describe("pipeline canvas flow migration", () => {
  it("synthesizes a start node and preserves request nodes from legacy pipelines", () => {
    const pipeline = createPipelineRecord("Legacy Flow");
    pipeline.steps = [
      {
        id: "req-1",
        name: "Fetch profile",
        method: "GET",
        url: "https://example.com/profile",
        headers: [],
        params: [],
        body: null,
        bodyType: "none",
        auth: { type: "none" },
        requestSource: { mode: "new" },
      },
    ];
    pipeline.flowDocument = {
      ...pipeline.flowDocument!,
      nodes: [
        {
          id: "req-1",
          kind: "request",
          dataRef: "req-1",
          geometry: { position: { x: 280, y: 40 } },
          position: { x: 280, y: 40 },
          config: { kind: "request" },
        },
      ],
      edges: [],
    };

    const flow = ensurePipelineFlowDocument(pipeline);

    expect(flow.nodes.some((node) => node.kind === "start")).toBe(true);
    expect(flow.nodes.some((node) => node.kind === "request" && node.requestRef === "req-1")).toBe(
      true,
    );
    expect(
      flow.edges.some((edge) => edge.source === `${pipeline.id}:start` && edge.target === "req-1"),
    ).toBe(true);
  });

  it("preserves custom node kinds already stored in the flow document", () => {
    const pipeline = createPipelineRecord("Multi Node");
    pipeline.flowDocument = {
      ...pipeline.flowDocument!,
      nodes: [
        pipeline.flowDocument!.nodes[0]!,
        createFlowNodeRecord(
          "condition",
          { x: 280, y: 0 },
          {
            id: "cond-1",
            config: {
              kind: "condition",
              label: "Check status",
              rules: [],
              expression: "response.status === 200",
            },
          },
        ),
      ],
      edges: [],
    };

    const flow = ensurePipelineFlowDocument(pipeline);

    expect(flow.nodes.find((node) => node.id === "cond-1")?.kind).toBe("condition");
  });
});

describe("pipeline execution support", () => {
  it("allows request-only flows", () => {
    const pipeline = createPipelineRecord("Requests Only");
    pipeline.steps = [
      {
        id: "req-1",
        name: "Fetch token",
        method: "POST",
        url: "https://example.com/token",
        headers: [],
        params: [],
        body: null,
        bodyType: "none",
        auth: { type: "none" },
        requestSource: { mode: "new" },
      },
    ];

    const support = getPipelineExecutionSupport(pipeline);

    expect(support.supported).toBe(true);
    expect(support.reason).toBeNull();
  });

  it("blocks execution when unsupported node kinds are present", () => {
    const pipeline = createPipelineRecord("Has Condition");
    pipeline.steps = [
      {
        id: "req-1",
        name: "Fetch token",
        method: "POST",
        url: "https://example.com/token",
        headers: [],
        params: [],
        body: null,
        bodyType: "none",
        auth: { type: "none" },
        requestSource: { mode: "new" },
      },
    ];
    pipeline.flowDocument = {
      ...ensurePipelineFlowDocument(pipeline),
      nodes: [
        ...ensurePipelineFlowDocument(pipeline).nodes,
        createFlowNodeRecord(
          "condition",
          { x: 620, y: 0 },
          {
            id: "cond-1",
            config: { kind: "condition", label: "Branch", rules: [], expression: "true" },
          },
        ),
      ],
    };

    const support = getPipelineExecutionSupport(pipeline);

    expect(support.supported).toBe(false);
    expect(support.reason).toContain("condition");
  });
});
