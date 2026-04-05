import type { Pipeline, PipelineStep } from "@/types";

import {
  ensureFlowDocument,
  getRequestBlocks,
  removeFlowBlock,
  replaceFlowBlock,
  stripStepGraphMetadata,
} from "./flow-document";
import { compileFlowDocumentToPipelineSteps } from "./flow-runtime";
import type { FlowConnection, RequestBlock } from "./types";

export function syncPipelineGraph(pipeline: Pipeline) {
  pipeline.flow = ensureFlowDocument(pipeline.flow, pipeline.steps);
  pipeline.steps = compileFlowDocumentToPipelineSteps(pipeline.flow);
  pipeline.updatedAt = new Date().toISOString();
}

export function addRequestStepToPipeline(pipeline: Pipeline, step: Omit<PipelineStep, "id">) {
  const blockId = crypto.randomUUID();
  const requestBlocks = getRequestBlocks(pipeline.flow);
  const lastRequest = requestBlocks.at(-1);
  const previousId = lastRequest?.id ?? pipeline.flow.blocks[0]?.id ?? "flow-start";
  const x = (lastRequest?.position.x ?? 280) + (lastRequest ? 360 : 0);

  pipeline.flow.blocks.push({
    id: blockId,
    type: "request",
    position: { x, y: 160 },
    data: stripStepGraphMetadata({ ...step, id: blockId }),
  });
  pipeline.flow.connections.push(
    createSequentialConnection(previousId, blockId, requestBlocks.length),
  );
  syncPipelineGraph(pipeline);
}

export function updateRequestStepInPipeline(
  pipeline: Pipeline,
  stepId: string,
  partial: Partial<PipelineStep>,
) {
  const block = pipeline.flow.blocks.find(
    (entry): entry is RequestBlock => entry.id === stepId && entry.type === "request",
  );
  if (!block) return;

  pipeline.flow = replaceFlowBlock(pipeline.flow, {
    ...block,
    data: { ...block.data, ...stripPartial(partial) },
  });
  syncPipelineGraph(pipeline);
}

export function removeRequestStepFromPipeline(pipeline: Pipeline, stepId: string) {
  pipeline.flow = removeFlowBlock(pipeline.flow, stepId);
  syncPipelineGraph(pipeline);
}

export function duplicateRequestStepInPipeline(pipeline: Pipeline, stepId: string) {
  const block = pipeline.flow.blocks.find(
    (entry): entry is RequestBlock => entry.id === stepId && entry.type === "request",
  );
  if (!block) return;

  const duplicateId = crypto.randomUUID();
  pipeline.flow.blocks.push({
    ...block,
    id: duplicateId,
    position: { x: block.position.x + 40, y: block.position.y + 260 },
    data: { ...block.data, name: `${block.data.name} (Copy)` },
  });
  pipeline.flow.connections.push(
    createSequentialConnection(stepId, duplicateId, pipeline.flow.connections.length),
  );
  syncPipelineGraph(pipeline);
}

export function reorderRequestStepsInPipeline(pipeline: Pipeline, stepIds: string[]) {
  const requestBlocks = getRequestBlocks(pipeline.flow);
  const blockById = new Map(requestBlocks.map((block) => [block.id, block]));
  const ordered = stepIds.map((stepId) => blockById.get(stepId)).filter(Boolean) as RequestBlock[];
  if (ordered.length === 0) return;

  pipeline.flow.blocks = [
    ...pipeline.flow.blocks.filter((block) => block.type !== "request"),
    ...ordered.map((block, index) => ({
      ...block,
      position: { x: 280 + index * 360, y: 160 },
    })),
  ];

  const nonRequestConnections = pipeline.flow.connections.filter(
    (connection) =>
      !stepIds.includes(connection.sourceBlockId) && !stepIds.includes(connection.targetBlockId),
  );

  pipeline.flow.connections = [
    ...nonRequestConnections,
    ...ordered.map((block, index) =>
      createSequentialConnection(
        index === 0 ? (pipeline.flow.blocks[0]?.id ?? "flow-start") : ordered[index - 1]!.id,
        block.id,
        index,
      ),
    ),
  ];
  syncPipelineGraph(pipeline);
}

function createSequentialConnection(
  sourceBlockId: string,
  targetBlockId: string,
  index: number,
): FlowConnection {
  return {
    id: `flow-edge-${index}-${sourceBlockId}-${targetBlockId}`,
    sourceBlockId,
    targetBlockId,
    sourceHandleId: sourceBlockId === "flow-start" ? "output" : "success",
    targetHandleId: "input",
    kind: "control",
  };
}

function stripPartial(partial: Partial<PipelineStep>) {
  const { id: _id, upstreamStepIds: _upstreamStepIds, ...rest } = partial;
  return rest;
}
