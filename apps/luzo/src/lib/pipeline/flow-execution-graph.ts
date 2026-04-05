import type { FlowBlock, FlowConnection } from "@/features/flow-editor/domain/types";
import type { Pipeline } from "@/types";
import { buildStepAliases } from "./dag-validator";
import { kahnTopoSort } from "./topo-sort";

export type FlowRuntimeNodeKind = "request" | "ai" | "condition";

export interface FlowRuntimeEdge {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandleId: string | null;
}

export interface FlowExecutionGraph {
  blockById: Map<string, FlowBlock>;
  executableStepIds: Set<string>;
  nodeKindById: Map<string, FlowRuntimeNodeKind>;
  outgoingByNodeId: Map<string, FlowRuntimeEdge[]>;
  incomingByNodeId: Map<string, FlowRuntimeEdge[]>;
  orderedNodeIds: string[];
  aliasesByStepId: Map<string, ReturnType<typeof buildStepAliases>[number]>;
}

export function buildFlowExecutionGraph(pipeline: Pipeline): FlowExecutionGraph | null {
  if (!pipeline.flow?.blocks?.length) return null;

  const blockById = new Map(pipeline.flow.blocks.map((block) => [block.id, block]));
  const executableStepIds = new Set(pipeline.steps.map((step) => step.id));
  const nodeKindById = new Map<string, FlowRuntimeNodeKind>();

  pipeline.flow.blocks.forEach((block) => {
    if (block.type === "evaluate") nodeKindById.set(block.id, "condition");
    if (block.type === "request" || block.type === "ai") nodeKindById.set(block.id, block.type);
  });

  if (nodeKindById.size === 0) return null;

  const outgoingByNodeId = new Map<string, FlowRuntimeEdge[]>();
  const incomingByNodeId = new Map<string, FlowRuntimeEdge[]>();
  const runtimeNodeIds = new Set(nodeKindById.keys());

  pipeline.flow.connections.forEach((connection) => {
    if (!isRelevantSource(connection.sourceBlockId, blockById, runtimeNodeIds)) return;
    if (!runtimeNodeIds.has(connection.targetBlockId)) return;

    const edge: FlowRuntimeEdge = {
      edgeId: connection.id,
      sourceNodeId: connection.sourceBlockId,
      targetNodeId: connection.targetBlockId,
      sourceHandleId: connection.sourceHandleId ?? null,
    };

    outgoingByNodeId.set(edge.sourceNodeId, [
      ...(outgoingByNodeId.get(edge.sourceNodeId) ?? []),
      edge,
    ]);
    incomingByNodeId.set(edge.targetNodeId, [
      ...(incomingByNodeId.get(edge.targetNodeId) ?? []),
      edge,
    ]);
  });

  const orderedNodeIds = topologicalRuntimeOrder(
    pipeline.flow.blocks,
    pipeline.flow.connections,
    runtimeNodeIds,
  );
  const aliasesByStepId = new Map(
    buildStepAliases(pipeline.steps).map((alias) => [alias.stepId, alias]),
  );

  return {
    blockById,
    executableStepIds,
    nodeKindById,
    outgoingByNodeId,
    incomingByNodeId,
    orderedNodeIds,
    aliasesByStepId,
  };
}

export function countFlowExecutionNodes(pipeline: Pipeline) {
  return buildFlowExecutionGraph(pipeline)?.orderedNodeIds.length ?? pipeline.steps.length;
}

function isRelevantSource(
  sourceNodeId: string,
  blockById: Map<string, FlowBlock>,
  runtimeNodeIds: Set<string>,
) {
  return (
    sourceNodeId === "flow-start" ||
    runtimeNodeIds.has(sourceNodeId) ||
    blockById.get(sourceNodeId)?.type === "start"
  );
}

function topologicalRuntimeOrder(
  blocks: FlowBlock[],
  connections: FlowConnection[],
  runtimeNodeIds: Set<string>,
) {
  const indegree = new Map<string, number>(Array.from(runtimeNodeIds, (id) => [id, 0]));
  const adjacency = new Map<string, string[]>();

  for (const connection of connections) {
    if (
      !runtimeNodeIds.has(connection.sourceBlockId) ||
      !runtimeNodeIds.has(connection.targetBlockId)
    )
      continue;
    adjacency.set(connection.sourceBlockId, [
      ...(adjacency.get(connection.sourceBlockId) ?? []),
      connection.targetBlockId,
    ]);
    indegree.set(connection.targetBlockId, (indegree.get(connection.targetBlockId) ?? 0) + 1);
  }

  const blockOrder = new Map(blocks.map((block, index) => [block.id, index]));
  const compare = (a: string, b: string) => (blockOrder.get(a) ?? 0) - (blockOrder.get(b) ?? 0);
  return kahnTopoSort(
    Array.from(runtimeNodeIds),
    indegree,
    (id) => adjacency.get(id) ?? [],
    compare,
  );
}
