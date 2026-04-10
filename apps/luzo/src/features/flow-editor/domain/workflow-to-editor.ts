import type {
  AssertNodeConfig,
  ConditionNodeConfig,
  DelayNodeConfig,
  FlowDocument as WorkflowFlowDocument,
  FlowEdgeRecord,
  ForEachNodeConfig,
  LogNodeConfig,
  PollNodeConfig,
  SwitchNodeConfig,
  TransformNodeConfig,
  WebhookWaitNodeConfig,
} from "@/types/workflow";
import type { PipelineStep } from "@/types";
import type {
  AssertBlock,
  DelayBlock,
  EndBlock,
  FlowBlock,
  FlowConnection,
  FlowDocument,
  ForEachBlock,
  IfBlock,
  LogBlock,
  PollBlock,
  RequestBlock,
  SwitchBlock,
  TransformBlock,
  WebhookWaitBlock,
} from "./types";
import { createDefaultFlowDocument, SUPPORTED_NODE_KINDS } from "./flow-document-shared";

export function ensureFlowDocument(
  workflow: WorkflowFlowDocument | undefined,
  steps: PipelineStep[],
): FlowDocument {
  if (!workflow || workflow.nodes.length === 0) {
    return createDefaultFlowDocument();
  }

  const stepsById = new Map(steps.map((step) => [step.id, step]));
  const blocks = workflow.nodes
    .filter((node) => SUPPORTED_NODE_KINDS.has(node.kind))
    .flatMap((node) => toEditorBlock(node, stepsById));
  const startBlock =
    blocks.find((block) => block.type === "start") ?? createDefaultFlowDocument().blocks[0]!;

  return {
    version: 1,
    blocks: [startBlock, ...blocks.filter((block) => block.id !== startBlock.id)],
    connections: workflow.edges.map(toEditorConnection),
    viewport: {
      x: workflow.viewport?.x ?? 40,
      y: workflow.viewport?.y ?? 40,
      scale: workflow.viewport?.zoom ?? 1,
    },
  };
}

function toEditorBlock(
  node: WorkflowFlowDocument["nodes"][number],
  stepsById: Map<string, PipelineStep>,
): FlowBlock[] {
  const position = node.geometry.position;

  if (node.kind === "start") {
    return [
      {
        id: node.id,
        type: "start",
        position,
        data: { label: node.config?.kind === "start" ? node.config.label : "Start" },
      },
    ];
  }

  if (node.kind === "condition") {
    const config = (node.config ?? {
      expression: "",
      kind: "condition",
      label: "If",
      rules: [],
    }) as ConditionNodeConfig;
    return [
      {
        id: node.id,
        type: "if",
        position,
        data: { expression: config.expression, hasFalseBranch: true, label: config.label },
      } satisfies IfBlock,
    ];
  }

  const mappedBlock = mapConfiguredBlock(node, position);
  if (mappedBlock) return [mappedBlock];

  const requestId = node.requestRef ?? node.dataRef ?? node.id;
  const step = stepsById.get(requestId);
  if (!step) return [];

  return [{ id: node.id, type: "request", position, data: stripStep(step) } satisfies RequestBlock];
}

function mapConfiguredBlock(
  node: WorkflowFlowDocument["nodes"][number],
  position: { x: number; y: number },
) {
  if (node.kind === "delay") {
    const config = node.config?.kind === "delay" ? (node.config as DelayNodeConfig) : null;
    return {
      id: node.id,
      type: "delay",
      position,
      data: { label: config?.label ?? "Delay", durationMs: config?.durationMs ?? 1000 },
    } satisfies DelayBlock;
  }

  if (node.kind === "end") {
    return {
      id: node.id,
      type: "end",
      position,
      data: { label: node.config?.kind === "end" ? node.config.label : "End" },
    } satisfies EndBlock;
  }

  if (node.kind === "forEach") {
    const config = node.config?.kind === "forEach" ? (node.config as ForEachNodeConfig) : null;
    return {
      id: node.id,
      type: "forEach",
      position,
      data: {
        label: config?.label ?? "ForEach",
        collectionPath: config?.collectionPath ?? "",
        mapExpression: config?.mapExpression,
      },
    } satisfies ForEachBlock;
  }

  if (node.kind === "transform") {
    const config = node.config?.kind === "transform" ? (node.config as TransformNodeConfig) : null;
    return {
      id: node.id,
      type: "transform",
      position,
      data: { label: config?.label ?? "Transform", script: config?.script ?? "" },
    } satisfies TransformBlock;
  }

  if (node.kind === "log") {
    const config = node.config?.kind === "log" ? (node.config as LogNodeConfig) : null;
    return {
      id: node.id,
      type: "log",
      position,
      data: { label: config?.label ?? "Log", message: config?.message ?? "" },
    } satisfies LogBlock;
  }

  if (node.kind === "assert") {
    const config = node.config?.kind === "assert" ? (node.config as AssertNodeConfig) : null;
    return {
      id: node.id,
      type: "assert",
      position,
      data: {
        label: config?.label ?? "Assert",
        expression: config?.expression ?? "",
        message: config?.message,
      },
    } satisfies AssertBlock;
  }

  if (node.kind === "webhookWait") {
    const config =
      node.config?.kind === "webhookWait" ? (node.config as WebhookWaitNodeConfig) : null;
    return {
      id: node.id,
      type: "webhookWait",
      position,
      data: {
        label: config?.label ?? "Webhook Wait",
        timeoutMs: config?.timeoutMs,
        correlationKey: config?.correlationKey,
      },
    } satisfies WebhookWaitBlock;
  }

  if (node.kind === "poll") {
    const config = node.config?.kind === "poll" ? (node.config as PollNodeConfig) : null;
    return {
      id: node.id,
      type: "poll",
      position,
      data: {
        label: config?.label ?? "Poll",
        stopCondition: config?.stopCondition ?? "",
        intervalMs: config?.intervalMs,
        maxAttempts: config?.maxAttempts,
      },
    } satisfies PollBlock;
  }

  if (node.kind === "switch") {
    const config = node.config?.kind === "switch" ? (node.config as SwitchNodeConfig) : null;
    return {
      id: node.id,
      type: "switch",
      position,
      data: {
        label: config?.label ?? "Switch",
        cases: config?.cases ?? [
          { id: "case_0", label: "Case 1", expression: "", isDefault: false },
          { id: "default", label: "Default", expression: "", isDefault: true },
        ],
      },
    } satisfies SwitchBlock;
  }

  return null;
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

function stripStep(step: PipelineStep): Omit<PipelineStep, "id"> {
  const { id: _id, ...rest } = step;
  return rest;
}
