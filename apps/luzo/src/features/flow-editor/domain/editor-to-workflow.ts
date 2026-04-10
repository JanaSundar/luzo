import type { Pipeline, PipelineStep } from "@/types";
import type {
  AssertNodeConfig,
  FlowDocument as WorkflowFlowDocument,
  FlowEdgeRecord,
  FlowNodeRecord,
  ForEachNodeConfig,
  PollNodeConfig,
  SwitchNodeConfig,
  TransformNodeConfig,
  WebhookWaitNodeConfig,
} from "@/types/workflow";
import { createDefaultRequestName } from "@/features/pipeline/request-names";
import type { FlowBlock, FlowConnection, FlowDocument, RequestBlock } from "./types";
import { createEmptyStep } from "./flow-document-shared";

export function toWorkflowFlowDocument(
  flow: FlowDocument,
  pipeline: Pick<Pipeline, "createdAt" | "id" | "name" | "updatedAt">,
): WorkflowFlowDocument {
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
    nodes: flow.blocks.map(toWorkflowNode),
    edges: flow.connections.map(toWorkflowEdge),
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

function toWorkflowNode(block: FlowBlock): FlowNodeRecord {
  if (block.type === "start") {
    return {
      id: block.id,
      kind: "start",
      geometry: { position: block.position },
      config: { kind: "start", label: block.data.label ?? "Start" },
    };
  }

  if (block.type === "if") {
    return {
      id: block.id,
      kind: "condition",
      geometry: { position: block.position },
      config: {
        kind: "condition",
        label: block.data.label ?? "If",
        rules: [],
        expression: block.data.expression ?? "",
      },
    };
  }

  const mapped = mapWorkflowConfigNode(block);
  if (mapped) return mapped;

  return {
    id: block.id,
    kind: "request",
    geometry: { position: block.position },
    requestRef: block.id,
    dataRef: block.id,
    config: { kind: "request", label: block.type === "request" ? block.data.name : "Request" },
  };
}

function mapWorkflowConfigNode(block: FlowBlock): FlowNodeRecord | null {
  if (block.type === "delay") {
    return {
      id: block.id,
      kind: "delay",
      geometry: { position: block.position },
      config: {
        kind: "delay",
        label: block.data.label ?? "Delay",
        durationMs: block.data.durationMs,
      },
    };
  }

  if (block.type === "end") {
    return {
      id: block.id,
      kind: "end",
      geometry: { position: block.position },
      config: { kind: "end", label: block.data.label ?? "End" },
    };
  }

  if (block.type === "forEach") {
    return {
      id: block.id,
      kind: "forEach",
      geometry: { position: block.position },
      config: {
        kind: "forEach",
        label: block.data.label ?? "ForEach",
        collectionPath: block.data.collectionPath ?? "",
        mapExpression: block.data.mapExpression,
      } satisfies ForEachNodeConfig,
    };
  }

  if (block.type === "transform") {
    return {
      id: block.id,
      kind: "transform",
      geometry: { position: block.position },
      config: {
        kind: "transform",
        label: block.data.label ?? "Transform",
        script: block.data.script ?? "",
      } satisfies TransformNodeConfig,
    };
  }

  if (block.type === "log") {
    return {
      id: block.id,
      kind: "log",
      geometry: { position: block.position },
      config: { kind: "log", label: block.data.label ?? "Log", message: block.data.message ?? "" },
    };
  }

  if (block.type === "assert") {
    return {
      id: block.id,
      kind: "assert",
      geometry: { position: block.position },
      config: {
        kind: "assert",
        label: block.data.label ?? "Assert",
        expression: block.data.expression ?? "",
        message: block.data.message,
      } satisfies AssertNodeConfig,
    };
  }

  if (block.type === "webhookWait") {
    return {
      id: block.id,
      kind: "webhookWait",
      geometry: { position: block.position },
      config: {
        kind: "webhookWait",
        label: block.data.label ?? "Webhook Wait",
        timeoutMs: block.data.timeoutMs,
        correlationKey: block.data.correlationKey,
      } satisfies WebhookWaitNodeConfig,
    };
  }

  if (block.type === "poll") {
    return {
      id: block.id,
      kind: "poll",
      geometry: { position: block.position },
      config: {
        kind: "poll",
        label: block.data.label ?? "Poll",
        stopCondition: block.data.stopCondition ?? "",
        intervalMs: block.data.intervalMs,
        maxAttempts: block.data.maxAttempts,
      } satisfies PollNodeConfig,
    };
  }

  if (block.type === "switch") {
    return {
      id: block.id,
      kind: "switch",
      geometry: { position: block.position },
      config: {
        kind: "switch",
        label: block.data.label ?? "Switch",
        cases: block.data.cases,
      } satisfies SwitchNodeConfig,
    };
  }

  return null;
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
      semantics === "false" ||
      semantics === "default" ||
      semantics.startsWith("case_")
        ? semantics
        : semantics === "fail"
          ? "failure"
          : "control",
  };
}
