import { describe, expect, it } from "vitest";

import { placeBlockWithCollisionResolution } from "@/features/flow-editor/domain/block-placement";
import type { FlowBlock } from "@/features/flow-editor/domain/types";

describe("placeBlockWithCollisionResolution", () => {
  it("pushes existing blocks away when a suggested block is inserted on top of them", () => {
    const blocks: FlowBlock[] = [
      {
        id: "flow-start",
        type: "start",
        position: { x: 64, y: 200 },
        data: { label: "Start" },
      },
      {
        id: "request-1",
        type: "request",
        position: { x: 280, y: 160 },
        data: {
          auth: { type: "none" },
          body: null,
          bodyType: "none",
          headers: [],
          method: "GET",
          name: "Orders",
          params: [],
          url: "https://api.example.com/orders",
        },
      },
    ];

    const nextBlocks = placeBlockWithCollisionResolution(blocks, {
      id: "request-2",
      type: "request",
      position: { x: 280, y: 160 },
      data: {
        auth: { type: "none" },
        body: null,
        bodyType: "none",
        headers: [],
        method: "GET",
        name: "Invoices",
        params: [],
        url: "https://api.example.com/invoices",
      },
    });

    const existingRequest = nextBlocks.find((block) => block.id === "request-1");
    const newRequest = nextBlocks.find((block) => block.id === "request-2");

    expect(newRequest?.position).toEqual({ x: 280, y: 160 });
    expect(existingRequest?.position).not.toEqual({ x: 280, y: 160 });
    expect(
      Math.abs((existingRequest?.position.x ?? 280) - 280) >= 328 ||
        Math.abs((existingRequest?.position.y ?? 160) - 160) >= 196,
    ).toBe(true);
  });
});
