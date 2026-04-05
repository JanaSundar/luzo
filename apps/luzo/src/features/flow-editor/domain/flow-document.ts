import type { PipelineStep } from "@/types";

import type { FlowBlock, FlowConnection, FlowDocument, RequestBlock } from "./types";

const START_BLOCK_ID = "flow-start";
const START_POSITION = { x: 64, y: 200 };
const REQUEST_X = 280;
const REQUEST_GAP = 360;

export function createDefaultFlowDocument(): FlowDocument {
  return {
    version: 1,
    blocks: [
      {
        id: START_BLOCK_ID,
        type: "start",
        position: START_POSITION,
        data: { label: "Start" },
      },
    ],
    connections: [],
    viewport: { x: 40, y: 40, scale: 1 },
  };
}

export function createFlowDocumentFromSteps(steps: PipelineStep[]): FlowDocument {
  const base = createDefaultFlowDocument();
  if (steps.length === 0) return base;

  const requestBlocks: RequestBlock[] = steps.map((step, index) => ({
    id: step.id,
    type: "request",
    position: { x: REQUEST_X + index * REQUEST_GAP, y: 160 },
    data: stripStepGraphMetadata(step),
  }));

  const connections: FlowConnection[] = requestBlocks.map((block, index) => ({
    id: `edge-${index}-${block.id}`,
    sourceBlockId: index === 0 ? START_BLOCK_ID : requestBlocks[index - 1]!.id,
    targetBlockId: block.id,
    sourceHandleId: index === 0 ? "output" : "success",
    targetHandleId: "input",
    kind: "control",
  }));

  return {
    ...base,
    blocks: [base.blocks[0]!, ...requestBlocks],
    connections,
  };
}

export function ensureFlowDocument(flow: FlowDocument | undefined, steps: PipelineStep[]) {
  if (flow && flow.blocks.length > 0) {
    return flow;
  }

  return createFlowDocumentFromSteps(steps);
}

export function getRequestBlocks(flow: FlowDocument) {
  return flow.blocks.filter((block): block is RequestBlock => block.type === "request");
}

export function stripStepGraphMetadata(
  step: PipelineStep,
): Omit<PipelineStep, "id" | "upstreamStepIds"> {
  const { id: _id, upstreamStepIds: _upstreamStepIds, ...rest } = step;
  return rest;
}

export function replaceFlowBlock(flow: FlowDocument, nextBlock: FlowBlock): FlowDocument {
  return {
    ...flow,
    blocks: flow.blocks.map((block) => (block.id === nextBlock.id ? nextBlock : block)),
  };
}

export function removeFlowBlock(flow: FlowDocument, blockId: string): FlowDocument {
  return {
    ...flow,
    blocks: flow.blocks.filter((block) => block.id !== blockId),
    connections: flow.connections.filter(
      (connection) => connection.sourceBlockId !== blockId && connection.targetBlockId !== blockId,
    ),
  };
}
