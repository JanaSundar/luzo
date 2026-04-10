import type { PipelineStep } from "@/types";
import type { FlowDocument as WorkflowFlowDocument } from "@/types/workflow";
import type { FlowDocument } from "./types";

export const START_BLOCK_ID = "flow-start";
export const START_POSITION = { x: 64, y: 200 };
export const SUPPORTED_NODE_KINDS = new Set([
  "start",
  "request",
  "condition",
  "delay",
  "end",
  "forEach",
  "transform",
  "log",
  "assert",
  "webhookWait",
  "poll",
  "switch",
]);

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

export function getUnsupportedWorkflowNodeKinds(workflow: WorkflowFlowDocument | undefined) {
  return Array.from(
    new Set(
      (workflow?.nodes ?? [])
        .map((node) => node.kind)
        .filter((kind) => !SUPPORTED_NODE_KINDS.has(kind)),
    ),
  );
}

export function createEmptyStep(id: string, name: string): PipelineStep {
  return {
    id,
    auth: { type: "none" },
    body: null,
    bodyType: "none",
    headers: [],
    method: "GET",
    name,
    params: [],
    url: "",
  };
}

export function stripStepGraphMetadata(step: PipelineStep): Omit<PipelineStep, "id"> {
  const { id: _id, ...rest } = step;
  return rest;
}
