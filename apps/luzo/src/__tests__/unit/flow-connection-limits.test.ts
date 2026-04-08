import { describe, expect, it } from "vitest";
import {
  appendConnectionWithFlowRules,
  canConnectWithFlowRules,
} from "@/features/flow-editor/domain/connection-limits";
import type { FlowConnection } from "@/features/flow-editor/domain/types";

describe("flow connection limits", () => {
  it("prevents duplicate connections to the same source handle and target", () => {
    const connections: FlowConnection[] = [
      {
        id: "edge-1",
        sourceBlockId: "request-a",
        sourceHandleId: "success",
        targetBlockId: "request-b",
        targetHandleId: "input",
        kind: "conditional",
      },
    ];

    expect(
      canConnectWithFlowRules(
        {
          source: "request-a",
          sourceHandle: "success",
          target: "request-b",
          targetHandle: "input",
        },
        connections,
      ),
    ).toBe(false);
  });

  it("keeps only one outbound success or failure connection per handle", () => {
    const connections: FlowConnection[] = [
      {
        id: "edge-1",
        sourceBlockId: "request-a",
        sourceHandleId: "success",
        targetBlockId: "request-b",
        targetHandleId: "input",
        kind: "conditional",
      },
      {
        id: "edge-2",
        sourceBlockId: "request-a",
        sourceHandleId: "output",
        targetBlockId: "request-c",
        targetHandleId: "input",
        kind: "control",
      },
    ];

    const nextConnections = appendConnectionWithFlowRules(connections, {
      id: "edge-3",
      sourceBlockId: "request-a",
      sourceHandleId: "success",
      targetBlockId: "request-d",
      targetHandleId: "input",
      kind: "conditional",
    });

    expect(nextConnections).toEqual([
      {
        id: "edge-2",
        sourceBlockId: "request-a",
        sourceHandleId: "output",
        targetBlockId: "request-c",
        targetHandleId: "input",
        kind: "control",
      },
      {
        id: "edge-3",
        sourceBlockId: "request-a",
        sourceHandleId: "success",
        targetBlockId: "request-d",
        targetHandleId: "input",
        kind: "conditional",
      },
    ]);
  });
});
