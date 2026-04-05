import type { StepSnapshot } from "@/types/pipeline-runtime";
import type { FlowExecutionGraph, FlowRuntimeEdge } from "./flow-execution-graph";

export type EdgeState = "pending" | "activated" | "skipped";
export type NodeState = "idle" | "running" | "waiting" | "succeeded" | "failed" | "skipped";
export type RoutingHandleId = "success" | "fail" | "true" | "false";

export interface RoutingDecision {
  chosenHandleId: string | null;
  chosenRouteId: string | null;
  skippedRouteIds: string[];
}

export function finalizeRoutingDecision(params: {
  nodeId: string;
  chosenHandleId: RoutingHandleId | null;
  terminalStatus: StepSnapshot["status"];
  graph: FlowExecutionGraph;
  edgeState: Map<string, EdgeState>;
  nodeState: Map<string, NodeState>;
  finalizedNodeIds: Set<string>;
}) {
  if (params.finalizedNodeIds.has(params.nodeId)) return null;

  params.finalizedNodeIds.add(params.nodeId);
  params.nodeState.set(params.nodeId, params.terminalStatus === "success" ? "succeeded" : "failed");

  const decision = resolveNodeRoutes({
    chosenHandleId: params.chosenHandleId,
    outgoingEdges: params.graph.outgoingByNodeId.get(params.nodeId) ?? [],
  });

  applyEdgeResolution(params.edgeState, decision);
  markSkippedNodes(params.graph, params.edgeState, params.nodeState);
  return decision;
}

export function getNodeEligibility(params: {
  nodeId: string;
  graph: FlowExecutionGraph;
  edgeState: Map<string, EdgeState>;
  nodeState: Map<string, NodeState>;
}) {
  if (params.nodeState.get(params.nodeId) !== "idle") return "not-idle" as const;

  const incomingEdges = params.graph.incomingByNodeId.get(params.nodeId) ?? [];
  if (incomingEdges.length === 0) return "runnable" as const;

  const incomingStates = incomingEdges.map(
    (edge) => params.edgeState.get(edge.edgeId) ?? "pending",
  );
  if (incomingStates.some((state) => state === "pending")) return "blocked" as const;
  if (incomingStates.some((state) => state === "activated")) return "runnable" as const;
  return "skipped" as const;
}

export function getRequestOutcomeHandle(status: StepSnapshot["status"]): RoutingHandleId {
  return status === "success" ? "success" : "fail";
}

export function getConditionOutcomeHandle(result: boolean | null): RoutingHandleId | null {
  if (result === true) return "true";
  if (result === false) return "false";
  return null;
}

export function getTargetNodeId(graph: FlowExecutionGraph, routeId: string | null) {
  if (!routeId) return null;
  for (const edges of graph.outgoingByNodeId.values()) {
    const match = edges.find((edge) => edge.edgeId === routeId);
    if (match) return match.targetNodeId;
  }
  return null;
}

function resolveNodeRoutes(params: {
  outgoingEdges: FlowRuntimeEdge[];
  chosenHandleId: string | null;
}): RoutingDecision {
  const hasExplicitHandles = params.outgoingEdges.some(
    (edge) => edge.sourceHandleId !== null && edge.sourceHandleId !== "output",
  );
  let chosenRouteId: string | null = null;
  const skippedRouteIds: string[] = [];

  params.outgoingEdges.forEach((edge) => {
    const activated = hasExplicitHandles
      ? edge.sourceHandleId === params.chosenHandleId
      : !edge.sourceHandleId || edge.sourceHandleId === "output";

    if (activated && chosenRouteId === null) {
      chosenRouteId = edge.edgeId;
      return;
    }

    skippedRouteIds.push(edge.edgeId);
  });

  return {
    chosenHandleId: params.chosenHandleId,
    chosenRouteId,
    skippedRouteIds,
  };
}

function applyEdgeResolution(edgeState: Map<string, EdgeState>, decision: RoutingDecision) {
  if (decision.chosenRouteId) edgeState.set(decision.chosenRouteId, "activated");
  decision.skippedRouteIds.forEach((edgeId) => edgeState.set(edgeId, "skipped"));
}

function markSkippedNodes(
  graph: FlowExecutionGraph,
  edgeState: Map<string, EdgeState>,
  nodeState: Map<string, NodeState>,
) {
  graph.orderedNodeIds.forEach((nodeId) => {
    if (getNodeEligibility({ edgeState, graph, nodeId, nodeState }) === "skipped") {
      nodeState.set(nodeId, "skipped");
    }
  });
}
