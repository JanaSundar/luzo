import { describe, expect, it } from "vitest";
import { applyEdgeChanges, applyNodeChanges, buildGraphIndex, validateFlow } from "@luzo/flow-core";
import type { FlowDocument } from "@/features/flow-editor/domain/types";

const baseFlow: FlowDocument = {
  version: 1,
  blocks: [
    {
      id: "flow-start",
      type: "start",
      position: { x: 0, y: 0 },
      data: { label: "Start" },
    },
    {
      id: "request-1",
      type: "request",
      position: { x: 100, y: 0 },
      data: {
        name: "Step 1",
        method: "GET",
        url: "https://example.com",
        headers: [],
        params: [],
        body: "",
        script: "",
        testScript: "",
        stepType: "request",
        auth: { type: "none" },
      } as unknown as FlowDocument["blocks"][number]["data"],
    } as FlowDocument["blocks"][number],
    {
      id: "condition-1",
      type: "evaluate",
      position: { x: 200, y: 0 },
      data: { conditionType: "if", expression: "true" },
    },
  ],
  connections: [
    {
      id: "c1",
      sourceBlockId: "flow-start",
      targetBlockId: "request-1",
      sourceHandleId: "output",
      targetHandleId: "input",
      kind: "control",
    },
    {
      id: "c2",
      sourceBlockId: "request-1",
      targetBlockId: "condition-1",
      sourceHandleId: "success",
      targetHandleId: "input",
      kind: "control",
    },
  ],
};

describe("@luzo/flow-core", () => {
  it("builds a graph index with route lookups and bitsets", () => {
    const index = buildGraphIndex({ document: baseFlow, includeBitsets: true });

    expect(index?.topoOrder).toEqual(["flow-start", "request-1", "condition-1"]);
    expect(index?.routeBySourceAndHandle.get("request-1")?.get("success")).toBe("c2");
    expect(index?.descendantBitsetByNode?.get("flow-start")).toBeDefined();
  });

  it("applies immutable node and edge changes", () => {
    const moved = applyNodeChanges({
      document: baseFlow,
      changes: [{ type: "position", id: "request-1", position: { x: 320, y: 40 } }],
    });
    const connected = applyEdgeChanges({
      document: moved,
      changes: [
        {
          type: "add",
          item: {
            id: "c3",
            source: "condition-1",
            target: "request-1",
            type: "conditional",
            sourceHandle: "true",
            targetHandle: "input",
          },
        },
      ],
    });

    expect(
      moved.blocks.find((block: FlowDocument["blocks"][number]) => block.id === "request-1")
        ?.position,
    ).toEqual({
      x: 320,
      y: 40,
    });
    expect(
      connected.connections.some(
        (connection: FlowDocument["connections"][number]) => connection.id === "c3",
      ),
    ).toBe(true);
    expect(baseFlow.connections.some((connection) => connection.id === "c3")).toBe(false);
  });

  it("reports structural validation problems", () => {
    const invalid: FlowDocument = {
      ...baseFlow,
      connections: [
        ...baseFlow.connections,
        {
          id: "c3",
          sourceBlockId: "condition-1",
          targetBlockId: "request-1",
          sourceHandleId: "true",
          targetHandleId: "input",
          kind: "conditional",
        },
      ],
    };

    const result = validateFlow({ document: invalid });

    expect(result.valid).toBe(false);
    expect(result.errors.some((issue: { code: string }) => issue.code === "cycle-detected")).toBe(
      true,
    );
  });
});
