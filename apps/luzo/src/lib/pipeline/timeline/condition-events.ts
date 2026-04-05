import type { PipelineExecutionLayout } from "@/lib/pipeline/execution-plan";
import type { DebugStatus } from "@/types/pipeline-runtime";
import type {
  ConditionTimelineEvent,
  TimelineConditionResultKind,
  TimelineEvent,
  RequestTimelineEvent,
  TimelineRouteDecision,
  TimelineRouteSkipReason,
} from "@/types/timeline-event";
import {
  bitsetToNodeIds,
  buildFlowGraphIndex,
  createNodeMembershipBitset,
  getRouteScopeBitset,
  hasBit,
  hasAnyBit,
  intersectBitsets,
  subtractBitsets,
  type FlowGraphIndex,
} from "./flow-graph";

import type { FlowDocument } from "@/features/flow-editor/domain/types";

export interface TimelineDerivedIndex {
  eventIdsByNodeId: Map<string, string[]>;
  conditionDecisionByEventId: Map<string, ConditionTimelineEvent>;
  routeScopeByRouteId: Map<string, Uint32Array>;
  sharedDownstreamByConditionEventId: Map<string, Uint32Array>;
}

export function buildTimelineEvents(params: {
  executionId: string;
  executionStatus: DebugStatus;
  flow?: FlowDocument | null;
  graphIndex?: FlowGraphIndex | null;
  layoutByStep: Map<string, PipelineExecutionLayout>;
  baseEvents: TimelineEvent[];
}) {
  // Use pre-built index when available (avoids O(V+E) rebuild on every streaming chunk).
  // Falls back to buildFlowGraphIndex(flow) when graphIndex is null (worker not yet ready)
  // or undefined (not passed by caller), preserving backward compatibility.
  const graph = params.graphIndex ?? buildFlowGraphIndex(params.flow);
  const requestEvents = params.baseEvents
    .filter((event): event is RequestTimelineEvent => event.eventKind === "request")
    .map((event) => ({
      ...event,
      nodeKind: (graph?.blockById.get(event.stepId)?.type ??
        "unknown") as RequestTimelineEvent["nodeKind"],
      routeDecision: event.routeDecision ?? buildRequestRouteDecision(event, graph),
    }));
  const directConditionEvents = params.baseEvents.filter(
    (event): event is ConditionTimelineEvent => event.eventKind === "condition",
  );
  const indexes = createDerivedIndex(requestEvents, graph);
  if (!graph)
    return {
      events: [...requestEvents, ...directConditionEvents] as TimelineEvent[],
      indexes,
      graph,
    };

  const directConditionNodeIds = new Set(directConditionEvents.map((event) => event.stepId));
  const conditionEvents = Array.from(graph.conditionRoutesByNode.keys())
    .filter((conditionNodeId) => !directConditionNodeIds.has(conditionNodeId))
    .map((conditionNodeId) =>
      toConditionEvent({
        conditionNodeId,
        executionId: params.executionId,
        executionStatus: params.executionStatus,
        graph,
        indexes,
        layoutByStep: params.layoutByStep,
        requestEvents,
      }),
    )
    .filter((event): event is ConditionTimelineEvent => event !== null);

  const hydratedDirectConditionEvents = directConditionEvents.map((event) =>
    hydrateConditionEvent({
      event,
      graph,
      indexes,
      requestEvents,
    }),
  );

  [...conditionEvents, ...hydratedDirectConditionEvents].forEach((event) =>
    indexes.conditionDecisionByEventId.set(event.eventId, event),
  );

  return {
    events: [...requestEvents, ...conditionEvents, ...hydratedDirectConditionEvents],
    indexes,
    graph,
  };
}

export function buildRequestRouteDecision(
  event: RequestTimelineEvent,
  graph: FlowGraphIndex | null,
): TimelineRouteDecision | null {
  if (!graph) return null;
  const chosenHandleId =
    event.status === "failed" ? "fail" : event.status === "completed" ? "success" : null;
  if (!chosenHandleId) return null;

  const routes = graph.adjacencyOut.get(event.stepId) ?? [];
  const routeMap = graph.routeBySourceAndHandle.get(event.stepId);
  const chosenRouteId = routeMap?.get(chosenHandleId) ?? null;
  if (
    !chosenRouteId &&
    routes.every((route) => !route.sourceHandleId || route.sourceHandleId === "output")
  ) {
    return null;
  }

  return {
    routeKind: "request-outcome",
    chosenRouteId,
    chosenHandleId,
    skippedRouteIds: routes
      .filter((route) => route.routeId !== chosenRouteId && route.sourceHandleId !== "output")
      .map((route) => route.routeId),
  };
}

function createDerivedIndex(
  requestEvents: RequestTimelineEvent[],
  graph: FlowGraphIndex | null,
): TimelineDerivedIndex {
  const eventIdsByNodeId = new Map<string, string[]>();
  requestEvents.forEach((event) => {
    eventIdsByNodeId.set(event.stepId, [
      ...(eventIdsByNodeId.get(event.stepId) ?? []),
      event.eventId,
    ]);
  });

  const routeScopeByRouteId = new Map<string, Uint32Array>();
  if (graph) {
    for (const routeId of graph.routeById.keys())
      routeScopeByRouteId.set(routeId, getRouteScopeBitset(routeId, graph));
  }

  return {
    eventIdsByNodeId,
    conditionDecisionByEventId: new Map(),
    routeScopeByRouteId,
    sharedDownstreamByConditionEventId: new Map(),
  };
}

function toConditionEvent(params: {
  conditionNodeId: string;
  executionId: string;
  executionStatus: DebugStatus;
  graph: FlowGraphIndex;
  indexes: TimelineDerivedIndex;
  layoutByStep: Map<string, PipelineExecutionLayout>;
  requestEvents: RequestTimelineEvent[];
}): ConditionTimelineEvent | null {
  const block = params.graph.blockById.get(params.conditionNodeId);
  if (!block || block.type !== "evaluate") return null;

  const executedBitset = createNodeMembershipBitset(
    params.requestEvents.map((event) => event.stepId),
    params.graph,
  );
  const ancestorHits = intersectBitsets(
    params.graph.ancestorBitsetByNode.get(params.conditionNodeId) ?? executedBitset,
    executedBitset,
  );
  const routeIds = params.graph.conditionRoutesByNode.get(params.conditionNodeId) ?? [];
  const routeScopes = routeIds.map(
    (routeId) => params.indexes.routeScopeByRouteId.get(routeId) ?? executedBitset,
  );
  const routeHits = routeScopes.map((scope) => intersectBitsets(scope, executedBitset));
  const directTargetHitIndexes = routeIds.reduce<number[]>((all, routeId, index) => {
    const targetNodeId = params.graph.routeById.get(routeId)?.targetNodeId;
    if (targetNodeId && params.indexes.eventIdsByNodeId.has(targetNodeId)) all.push(index);
    return all;
  }, []);
  const hasUpstreamExecution = hasAnyBit(ancestorHits);
  const activeRouteIndexes = routeHits.reduce<number[]>((all, hits, index) => {
    if (hasAnyBit(hits)) all.push(index);
    return all;
  }, []);

  if (!hasUpstreamExecution && activeRouteIndexes.length === 0) return null;

  const exclusiveHitCounts = routeScopes.map(
    (scope, index) =>
      bitsetToNodeIds(
        intersectBitsets(
          scope,
          subtractBitsets(executedBitset, unionOtherRoutes(routeScopes, index)),
        ),
        params.graph,
      ).length,
  );
  const chosenIndex = resolveChosenRouteIndex({
    activeRouteIndexes,
    directTargetHitIndexes,
    exclusiveHitCounts,
  });
  const chosenRouteId = chosenIndex === -1 ? null : (routeIds[chosenIndex] ?? null);
  const chosenRoute = chosenRouteId ? (params.graph.routeById.get(chosenRouteId) ?? null) : null;
  const chosenHandleId = chosenRoute?.sourceHandleId ?? null;
  const skippedRouteIds = routeIds.filter((routeId) => routeId !== chosenRouteId);
  const sharedDownstream =
    chosenIndex === -1
      ? intersectAll(routeScopes)
      : intersectAll(routeScopes.filter((_, index) => index !== chosenIndex));
  const sharedNodeIds = bitsetToNodeIds(
    intersectBitsets(sharedDownstream, routeScopes[chosenIndex] ?? sharedDownstream),
    params.graph,
  );
  const chosenScope = chosenRouteId
    ? (params.indexes.routeScopeByRouteId.get(chosenRouteId) ?? executedBitset)
    : executedBitset;
  const affectedExecutedNodeIds = chosenRouteId
    ? bitsetToNodeIds(intersectBitsets(chosenScope, executedBitset), params.graph).filter(
        (nodeId) => nodeId !== params.conditionNodeId,
      )
    : [];
  const affectedSkippedNodeIds = skippedRouteIds.flatMap((routeId) =>
    bitsetToNodeIds(
      subtractBitsets(
        params.indexes.routeScopeByRouteId.get(routeId) ?? executedBitset,
        chosenRouteId ? sharedDownstream : executedBitset,
      ),
      params.graph,
    ),
  );

  const upstreamRequest = [...params.requestEvents]
    .reverse()
    .find((event) =>
      hasBit(
        params.graph.ancestorBitsetByNode.get(params.conditionNodeId) ?? executedBitset,
        params.graph.nodeIndexById.get(event.stepId),
      ),
    );

  const resultKind = toConditionResultKind(block.data.conditionType, chosenHandleId, chosenIndex);
  const resultLabel = chosenHandleId ? formatHandleLabel(chosenHandleId) : null;
  const layout = params.layoutByStep.get(upstreamRequest?.stepId ?? "");
  const status =
    chosenRouteId || params.executionStatus === "completed" || params.executionStatus === "error"
      ? "completed"
      : hasUpstreamExecution && params.executionStatus === "running"
        ? "running"
        : "ready";
  const nextSequence =
    minSequenceForNodes(affectedExecutedNodeIds, params.requestEvents) ??
    (upstreamRequest?.sequenceNumber ?? layout?.depth ?? 0) + 0.5;
  const event: ConditionTimelineEvent = {
    eventId: `${params.executionId}:condition:${params.conditionNodeId}`,
    executionId: params.executionId,
    stepId: params.conditionNodeId,
    stepName: block.data.label?.trim() || "Condition",
    eventKind: "condition",
    nodeKind: "evaluate",
    stageIndex: layout?.depth ?? upstreamRequest?.stageIndex ?? 0,
    branchId: null,
    status,
    timestamp: upstreamRequest?.timestamp ?? Date.now(),
    startedAt: upstreamRequest?.endedAt ?? upstreamRequest?.startedAt ?? null,
    endedAt: chosenRouteId
      ? (upstreamRequest?.endedAt ?? upstreamRequest?.startedAt ?? null)
      : null,
    durationMs: null,
    sequenceNumber: nextSequence - 0.5,
    retryCount: 0,
    conditionId: params.conditionNodeId,
    conditionNodeId: params.conditionNodeId,
    conditionType: block.data.conditionType,
    expression: block.data.expression?.trim() || null,
    expressionSummary: block.data.expression?.trim() || block.data.label?.trim() || "Condition",
    resultKind,
    resultLabel,
    chosenRouteId,
    chosenHandleId,
    chosenTargetNodeId: chosenRoute?.targetNodeId ?? null,
    skippedRouteIds,
    skippedTargetNodeIds: skippedRouteIds
      .map((routeId) => params.graph.routeById.get(routeId)?.targetNodeId)
      .filter((nodeId): nodeId is string => Boolean(nodeId)),
    skipReasonByRouteId: Object.fromEntries(
      skippedRouteIds.map(
        (routeId) =>
          [routeId, chosenRouteId ? "not-selected" : "upstream-not-reached"] satisfies [
            string,
            TimelineRouteSkipReason,
          ],
      ),
    ),
    affectedExecutedNodeIds,
    affectedSkippedNodeIds: Array.from(new Set(affectedSkippedNodeIds)),
    sharedDownstreamNodeIds: sharedNodeIds,
    upstreamRequestEventId: upstreamRequest?.eventId ?? null,
    resolvedAt: chosenRouteId
      ? (upstreamRequest?.endedAt ?? upstreamRequest?.startedAt ?? null)
      : null,
    routeDecisionKey: `${params.executionId}:${params.conditionNodeId}:${chosenRouteId ?? "pending"}`,
  };

  params.indexes.sharedDownstreamByConditionEventId.set(
    event.eventId,
    intersectBitsets(sharedDownstream, chosenScope),
  );

  return event;
}

function hydrateConditionEvent(params: {
  event: ConditionTimelineEvent;
  graph: FlowGraphIndex;
  indexes: TimelineDerivedIndex;
  requestEvents: RequestTimelineEvent[];
}) {
  const chosenRouteId = params.event.chosenRouteId;
  const routeIds = params.graph.conditionRoutesByNode.get(params.event.stepId) ?? [];
  const skippedRouteIds = routeIds.filter((routeId) => routeId !== chosenRouteId);
  const chosenScope = chosenRouteId
    ? (params.indexes.routeScopeByRouteId.get(chosenRouteId) ??
      createNodeMembershipBitset([], params.graph))
    : createNodeMembershipBitset([], params.graph);
  const executedBitset = createNodeMembershipBitset(
    params.requestEvents.map((entry) => entry.stepId),
    params.graph,
  );
  const affectedExecutedNodeIds = chosenRouteId
    ? bitsetToNodeIds(intersectBitsets(chosenScope, executedBitset), params.graph).filter(
        (nodeId) => nodeId !== params.event.stepId,
      )
    : [];
  const sharedDownstream = intersectAll(
    skippedRouteIds
      .map((routeId) => params.indexes.routeScopeByRouteId.get(routeId))
      .filter((scope): scope is Uint32Array => Boolean(scope)),
  );
  const affectedSkippedNodeIds = skippedRouteIds.flatMap((routeId) =>
    bitsetToNodeIds(
      subtractBitsets(
        params.indexes.routeScopeByRouteId.get(routeId) ??
          createNodeMembershipBitset([], params.graph),
        chosenRouteId ? sharedDownstream : executedBitset,
      ),
      params.graph,
    ),
  );

  const nextEvent: ConditionTimelineEvent = {
    ...params.event,
    conditionType:
      getConditionType(params.graph, params.event.stepId) ?? params.event.conditionType,
    skippedRouteIds,
    skippedTargetNodeIds: skippedRouteIds
      .map((routeId) => params.graph.routeById.get(routeId)?.targetNodeId)
      .filter((nodeId): nodeId is string => Boolean(nodeId)),
    skipReasonByRouteId: Object.fromEntries(
      skippedRouteIds.map(
        (routeId) =>
          [routeId, chosenRouteId ? "not-selected" : "upstream-not-reached"] satisfies [
            string,
            TimelineRouteSkipReason,
          ],
      ),
    ),
    affectedExecutedNodeIds,
    affectedSkippedNodeIds: Array.from(new Set(affectedSkippedNodeIds)),
    sharedDownstreamNodeIds: bitsetToNodeIds(
      intersectBitsets(sharedDownstream, chosenScope),
      params.graph,
    ),
  };

  params.indexes.sharedDownstreamByConditionEventId.set(
    nextEvent.eventId,
    intersectBitsets(sharedDownstream, chosenScope),
  );

  return nextEvent;
}

function getConditionType(graph: FlowGraphIndex, nodeId: string) {
  const block = graph.blockById.get(nodeId);
  return block?.type === "evaluate" ? block.data.conditionType : null;
}

function unionOtherRoutes(routeScopes: Uint32Array[], index: number) {
  return unionAll(routeScopes.filter((_, scopeIndex) => scopeIndex !== index));
}

function intersectAll(routeScopes: Uint32Array[]) {
  if (routeScopes.length === 0) return new Uint32Array(1);
  return routeScopes
    .slice(1)
    .reduce((memo, scope) => intersectBitsets(memo, scope), routeScopes[0]!);
}

function unionAll(routeScopes: Uint32Array[]) {
  if (routeScopes.length === 0) return new Uint32Array(1);
  return routeScopes.slice(1).reduce((memo, scope) => orBitsets(memo, scope), routeScopes[0]!);
}

function orBitsets(left: Uint32Array, right: Uint32Array) {
  const next = new Uint32Array(Math.max(left.length, right.length));
  for (let i = 0; i < next.length; i++) next[i] = (left[i] ?? 0) | (right[i] ?? 0);
  return next;
}

function resolveChosenRouteIndex(params: {
  activeRouteIndexes: number[];
  directTargetHitIndexes: number[];
  exclusiveHitCounts: number[];
}) {
  if (params.directTargetHitIndexes.length === 1) return params.directTargetHitIndexes[0]!;

  let bestIndex = -1;
  let bestCount = 0;
  params.activeRouteIndexes.forEach((routeIndex) => {
    const count = params.exclusiveHitCounts[routeIndex] ?? 0;
    if (count > bestCount) {
      bestCount = count;
      bestIndex = routeIndex;
    }
  });
  if (bestIndex !== -1) return bestIndex;
  return params.activeRouteIndexes.length === 1 ? params.activeRouteIndexes[0]! : -1;
}

function minSequenceForNodes(nodeIds: string[], events: RequestTimelineEvent[]) {
  const sequenceNumbers = events
    .filter((event) => nodeIds.includes(event.stepId))
    .map((event) => event.sequenceNumber);
  return sequenceNumbers.length > 0 ? Math.min(...sequenceNumbers) : null;
}

function toConditionResultKind(
  conditionType: ConditionTimelineEvent["conditionType"],
  chosenHandleId: string | null,
  chosenIndex: number,
): TimelineConditionResultKind | null {
  if (chosenIndex === -1) return null;
  if (chosenHandleId === "true") return "true";
  if (chosenHandleId === "false") return "false";
  return conditionType === "switch" ? "match" : null;
}

function formatHandleLabel(handleId: string) {
  switch (handleId) {
    case "true":
      return "True";
    case "false":
      return "False";
    case "success":
      return "Success route";
    case "fail":
      return "Fail route";
    default:
      return handleId;
  }
}
