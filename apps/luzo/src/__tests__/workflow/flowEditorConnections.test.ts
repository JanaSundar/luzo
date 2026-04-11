import { describe, expect, it } from "vitest";
import {
  ensureFlowDocument,
  toWorkflowFlowDocument,
} from "@/features/flow-editor/domain/flow-document";
import type { FlowDocument } from "@/features/flow-editor/domain/types";
import type { FlowDocument as WorkflowFlowDocument } from "@/types/workflow";

describe("flow editor connections", () => {
  it("preserves the request failure handle across workflow round-trips", () => {
    const editorFlow: FlowDocument = {
      version: 1,
      blocks: [
        { id: "flow-start", type: "start", position: { x: 64, y: 200 }, data: { label: "Start" } },
        {
          id: "req-parent",
          type: "request",
          position: { x: 280, y: 160 },
          data: {
            auth: { type: "none" },
            body: null,
            bodyType: "none",
            headers: [],
            method: "GET",
            name: "Parent",
            params: [],
            url: "https://example.com",
          },
        },
        {
          id: "req-child",
          type: "request",
          position: { x: 620, y: 260 },
          data: {
            auth: { type: "none" },
            body: null,
            bodyType: "none",
            headers: [],
            method: "GET",
            name: "Child",
            params: [],
            url: "https://example.com/failure",
          },
        },
      ],
      connections: [
        {
          id: "failure-edge",
          kind: "control",
          sourceBlockId: "req-parent",
          sourceHandleId: "fail",
          targetBlockId: "req-child",
          targetHandleId: "input",
        },
      ],
      viewport: { x: 0, y: 0, scale: 1 },
    };

    const workflow = toWorkflowFlowDocument(editorFlow, {
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "pipeline-1",
      name: "Failure branch",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(workflow.edges[0]?.semantics).toBe("failure");
    expect(workflow.edges[0]?.sourceHandle).toBe("fail");

    const roundTripped = ensureFlowDocument(workflow, [
      { ...editorFlow.blocks[1]!.data, id: "req-parent", name: "Parent" },
      { ...editorFlow.blocks[2]!.data, id: "req-child", name: "Child" },
    ]);

    expect(roundTripped.connections[0]?.sourceHandleId).toBe("fail");
  });

  it("falls back to legacy node positions when geometry is missing", () => {
    const workflow = {
      kind: "flow-document",
      version: 1,
      id: "flow-1",
      name: "Legacy flow",
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        {
          id: "start-1",
          kind: "start",
          config: { kind: "start", label: "Start" },
          geometry: undefined,
          position: { x: 64, y: 200 },
        },
        {
          id: "req-1",
          kind: "request",
          config: { kind: "request", label: "Request" },
          geometry: undefined,
          position: { x: 320, y: 180 },
          requestRef: "req-1",
        },
      ],
      edges: [],
    } as unknown as WorkflowFlowDocument;

    const roundTripped = ensureFlowDocument(workflow, [
      {
        id: "req-1",
        auth: { type: "none" },
        body: null,
        bodyType: "none",
        headers: [],
        method: "GET",
        name: "Legacy Request",
        params: [],
        url: "https://example.com",
      },
    ]);

    expect(roundTripped.blocks.find((block) => block.id === "start-1")?.position).toEqual({
      x: 64,
      y: 200,
    });
    expect(roundTripped.blocks.find((block) => block.id === "req-1")?.position).toEqual({
      x: 320,
      y: 180,
    });
  });
});
