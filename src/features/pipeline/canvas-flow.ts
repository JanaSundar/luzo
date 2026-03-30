import type { Pipeline } from "@/types";
import type { FlowDocument, FlowEdgeRecord, FlowNodeRecord } from "@/types/workflow";
import {
  buildRequestDependencyEdges,
  dedupeEdges,
  withStartConnections,
} from "./canvas-flow-edges";
import { createDefaultNodeConfig, createFlowNodeRecord } from "./canvas-flow-nodes";

export * from "./canvas-flow-edges";
export * from "./canvas-flow-nodes";

export const REQUEST_NODE_X = 320;
export const REQUEST_NODE_GAP = 280;

export function ensurePipelineFlowDocument(pipeline: Pipeline): FlowDocument {
  const existing = pipeline.flowDocument;
  const requestNodeMap = new Map(
    (existing?.nodes ?? [])
      .filter((node) => node.kind === "request")
      .map((node) => [node.requestRef ?? node.dataRef ?? node.id, node]),
  );
  const passthroughNodes = (existing?.nodes ?? []).filter((node) => node.kind !== "request");

  const requestNodes = pipeline.steps.map((step, index) => {
    const existingNode = requestNodeMap.get(step.id);
    return createFlowNodeRecord(
      "request",
      existingNode?.position ?? { x: REQUEST_NODE_X + index * REQUEST_NODE_GAP, y: 0 },
      {
        ...existingNode,
        id: existingNode?.id ?? step.id,
        dataRef: step.id,
        requestRef: step.id,
        config: {
          kind: "request",
          label: step.name,
        },
      },
    );
  });

  const allNonRequestNodes = passthroughNodes.map((node) => ({
    ...node,
    config: node.config ?? createDefaultNodeConfig(node.kind),
  }));
  const startNode =
    allNonRequestNodes.find((node) => node.kind === "start") ??
    createFlowNodeRecord("start", inferStartPosition(requestNodes), {
      id: `${pipeline.id}:start`,
      config: { kind: "start", label: "Start" },
    });

  const otherNodes = allNonRequestNodes.filter((node) => node.id !== startNode.id);
  const orderedNonStartNodes = orderNodesLikeExisting(
    existing?.nodes ?? [],
    requestNodes,
    otherNodes,
  );
  const nodeIds = new Set([
    startNode.id,
    ...requestNodes.map((node) => node.id),
    ...otherNodes.map((node) => node.id),
  ]);
  const requestIdToNodeId = new Map(
    requestNodes.map((node) => [node.requestRef ?? node.dataRef ?? node.id, node.id]),
  );

  const existingEdges = (existing?.edges ?? [])
    .map((edge) => {
      const sourceId = nodeIds.has(edge.source) ? edge.source : requestIdToNodeId.get(edge.source);
      const targetId = nodeIds.has(edge.target) ? edge.target : requestIdToNodeId.get(edge.target);
      if (sourceId && targetId) {
        return { ...edge, source: sourceId, target: targetId };
      }
      return null;
    })
    .filter((edge): edge is FlowEdgeRecord => edge !== null);

  const hasSubflows = passthroughNodes.some((node) => node.kind === "subflow");

  const derivedImplicitEdges = buildRequestDependencyEdges(pipeline.steps, {
    includePositionalAliases: !hasSubflows,
  })
    .map((edge) => {
      const sourceId = requestIdToNodeId.get(edge.source);
      const targetId = requestIdToNodeId.get(edge.target);
      if (sourceId && targetId) {
        return { ...edge, source: sourceId, target: targetId };
      }
      return null;
    })
    .filter((edge): edge is FlowEdgeRecord => edge !== null);

  const allBaseEdges = dedupeEdges([...existingEdges, ...derivedImplicitEdges]);
  const executableNodeIds = orderedNonStartNodes
    .filter((node) => node.kind !== "start")
    .map((node) => node.id);

  const edges = withStartConnections(allBaseEdges, startNode.id, executableNodeIds);

  return {
    kind: "flow-document",
    version: 1,
    id: pipeline.id,
    name: pipeline.name,
    createdAt: existing?.createdAt ?? pipeline.createdAt,
    updatedAt: pipeline.updatedAt,
    viewport: existing?.viewport ?? { x: 0, y: 0, zoom: 1 },
    nodes: [startNode, ...orderedNonStartNodes],
    edges,
  };
}

export function getPipelineExecutionSupport(pipeline: Pipeline) {
  const flow = ensurePipelineFlowDocument(pipeline);
  const unsupportedKinds = Array.from(
    new Set(
      flow.nodes
        .filter((node) => !["start", "request", "subflow"].includes(node.kind))
        .map((node) => node.kind),
    ),
  );

  if (unsupportedKinds.length > 0) {
    return {
      supported: false,
      reason: `Execution is available for request and subflow pipelines right now. Remove ${unsupportedKinds.join(", ")} node${unsupportedKinds.length === 1 ? "" : "s"} to run or debug.`,
      unsupportedKinds,
    };
  }

  const executableNodes = flow.nodes.filter(
    (node) => node.kind === "request" || node.kind === "subflow",
  );
  if (executableNodes.length === 0) {
    return {
      supported: false,
      reason: "Add at least one request or subflow node before running this pipeline.",
      unsupportedKinds: [],
    };
  }

  return {
    supported: true,
    reason: null,
    unsupportedKinds: [],
  };
}

export function inferStartPosition(requestNodes: FlowNodeRecord[]) {
  const leftMostX =
    requestNodes.length > 0
      ? Math.min(...requestNodes.map((node) => node.geometry.position.x))
      : REQUEST_NODE_X;
  const firstY = requestNodes[0]?.geometry.position.y ?? 0;
  return { x: leftMostX - REQUEST_NODE_GAP, y: firstY };
}

export function orderNodesLikeExisting(
  existingNodes: FlowNodeRecord[],
  requestNodes: FlowNodeRecord[],
  otherNodes: FlowNodeRecord[],
) {
  const requestById = new Map(requestNodes.map((node) => [node.id, node]));
  const otherById = new Map(otherNodes.map((node) => [node.id, node]));
  const ordered: FlowNodeRecord[] = [];
  const seen = new Set<string>();

  existingNodes.forEach((node) => {
    if (node.kind === "start") return;
    const next = requestById.get(node.id) ?? otherById.get(node.id);
    if (!next || seen.has(next.id)) return;
    ordered.push(next);
    seen.add(next.id);
  });

  [...requestNodes, ...otherNodes].forEach((node) => {
    if (node.kind === "start" || seen.has(node.id)) return;
    ordered.push(node);
    seen.add(node.id);
  });

  return ordered;
}
