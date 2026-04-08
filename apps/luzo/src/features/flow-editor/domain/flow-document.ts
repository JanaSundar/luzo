import type { Pipeline, PipelineStep } from "@/types";
import type {
  ConditionNodeConfig,
  FlowDocument as WorkflowFlowDocument,
  FlowEdgeRecord,
  FlowNodeRecord,
} from "@/types/workflow";
import { createDefaultRequestName } from "@/features/pipeline/request-names";

import type { EvaluateBlock, FlowBlock, FlowConnection, FlowDocument, RequestBlock } from "./types";

const START_BLOCK_ID = "flow-start";
const START_POSITION = { x: 64, y: 200 };
const SUPPORTED_NODE_KINDS = new Set(["start", "request", "condition"]);

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

export function ensureFlowDocument(
  workflow: WorkflowFlowDocument | undefined,
  steps: PipelineStep[],
): FlowDocument {
  if (!workflow || workflow.nodes.length === 0) {
    return createDefaultFlowDocument();
  }

  const stepsById = new Map(steps.map((step) => [step.id, step]));
  const blocks: FlowBlock[] = [];
  workflow.nodes
    .filter((node) => SUPPORTED_NODE_KINDS.has(node.kind))
    .forEach((node) => {
      const position = node.geometry.position;
      if (node.kind === "start") {
        blocks.push({
          id: node.id,
          type: "start",
          position,
          data: { label: node.config?.kind === "start" ? node.config.label : "Start" },
        });
        return;
      }

      if (node.kind === "condition") {
        const config = (node.config ?? {
          expression: "",
          kind: "condition",
          label: "Evaluate",
          rules: [],
        }) as ConditionNodeConfig;

        blocks.push({
          id: node.id,
          type: "evaluate",
          position,
          data: {
            conditionType: "if",
            expression: config.expression,
            hasFalseBranch: true,
            label: config.label,
            variables: [],
          },
        } satisfies EvaluateBlock);
        return;
      }

      const requestId = node.requestRef ?? node.dataRef ?? node.id;
      const step = stepsById.get(requestId);
      if (!step) return;
      blocks.push({
        id: node.id,
        type: "request",
        position,
        data: stripStepGraphMetadata(step),
      } satisfies RequestBlock);
    });

  const startBlock =
    blocks.find((block) => block.type === "start") ?? createDefaultFlowDocument().blocks[0]!;

  const connections = workflow.edges.map(toEditorConnection);

  return {
    version: 1,
    blocks: [startBlock, ...blocks.filter((block) => block.id !== startBlock.id)],
    connections,
    viewport: {
      x: workflow.viewport?.x ?? 40,
      y: workflow.viewport?.y ?? 40,
      scale: workflow.viewport?.zoom ?? 1,
    },
  };
}

export function toWorkflowFlowDocument(
  flow: FlowDocument,
  pipeline: Pick<Pipeline, "createdAt" | "id" | "name" | "updatedAt">,
): WorkflowFlowDocument {
  const nodes = flow.blocks.map(toWorkflowNode);
  const edges = flow.connections.map(toWorkflowEdge);

  return {
    kind: "flow-document",
    version: 1,
    id: pipeline.id,
    name: pipeline.name,
    createdAt: pipeline.createdAt,
    updatedAt: new Date().toISOString(),
    viewport: {
      x: flow.viewport?.x ?? 0,
      y: flow.viewport?.y ?? 0,
      zoom: flow.viewport?.scale ?? 1,
    },
    nodes,
    edges,
  };
}

export function syncPipelineSteps(
  flow: FlowDocument,
  existingSteps: PipelineStep[],
): PipelineStep[] {
  const existingById = new Map(existingSteps.map((step) => [step.id, step]));
  const usedNames = new Set(existingSteps.map((step) => step.name));

  return getRequestBlocks(flow).map((block) => {
    const previous = existingById.get(block.id);
    const fallbackName = createDefaultRequestName(usedNames);
    const nextName = block.data.name?.trim() || previous?.name || fallbackName;
    usedNames.add(nextName);

    return {
      ...(previous ?? createEmptyStep(block.id, fallbackName)),
      ...block.data,
      id: block.id,
      name: nextName,
    };
  });
}

export function getRequestBlocks(flow: FlowDocument) {
  return flow.blocks.filter((block): block is RequestBlock => block.type === "request");
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

export function stripStepGraphMetadata(step: PipelineStep): Omit<PipelineStep, "id"> {
  const { id: _id, ...rest } = step;
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

function createEmptyStep(id: string, name: string): PipelineStep {
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

function toEditorConnection(edge: FlowEdgeRecord): FlowConnection {
  const sourceHandleId =
    edge.sourceHandle === "failure"
      ? "fail"
      : (edge.sourceHandle ??
        (edge.semantics === "control"
          ? "output"
          : edge.semantics === "failure"
            ? "fail"
            : edge.semantics));

  return {
    id: edge.id,
    sourceBlockId: edge.source,
    sourceHandleId,
    targetBlockId: edge.target,
    targetHandleId: edge.targetHandle ?? "input",
    kind: edge.semantics === "control" ? "control" : "conditional",
  };
}

function toWorkflowNode(block: FlowBlock): FlowNodeRecord {
  if (block.type === "start") {
    return {
      id: block.id,
      kind: "start",
      geometry: { position: block.position },
      config: { kind: "start", label: block.data.label ?? "Start" },
    };
  }

  if (block.type === "evaluate") {
    return {
      id: block.id,
      kind: "condition",
      geometry: { position: block.position },
      config: {
        kind: "condition",
        label: block.data.label ?? "Evaluate",
        rules: [],
        expression: block.data.expression ?? "",
      },
    };
  }

  return {
    id: block.id,
    kind: "request",
    geometry: { position: block.position },
    requestRef: block.id,
    dataRef: block.id,
    config: { kind: "request", label: block.type === "request" ? block.data.name : "Request" },
  };
}

function toWorkflowEdge(connection: FlowConnection): FlowEdgeRecord {
  const sourceHandle = connection.sourceHandleId === "failure" ? "fail" : connection.sourceHandleId;
  const semantics = sourceHandle ?? "output";

  return {
    id: connection.id,
    source: connection.sourceBlockId,
    target: connection.targetBlockId,
    sourceHandle,
    targetHandle: connection.targetHandleId,
    semantics:
      semantics === "success" ||
      semantics === "failure" ||
      semantics === "true" ||
      semantics === "false"
        ? semantics
        : semantics === "fail"
          ? "failure"
          : "control",
  };
}
