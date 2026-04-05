import type { Pipeline } from "@/types";
import type { GeneratorYield, StepSnapshot } from "@/types/pipeline-runtime";
import { createConditionCompletedSnapshot, createInitialSnapshot } from "./pipeline-snapshot-utils";
import { buildYield, type GeneratorOptions } from "./generator-executor-shared";
import { evaluateConditionExpression } from "./condition-expression";
import type { FlowExecutionGraph } from "./flow-execution-graph";
import { executeParallelStage, executeStepGenerator } from "./generator-step-executor";
import {
  attachRouteDecisionToYield,
  getSnapshotByStepId,
  replaceSnapshotByStepId,
} from "./generator-flow-snapshots";
import {
  type EdgeState,
  finalizeRoutingDecision,
  getConditionOutcomeHandle,
  getRequestOutcomeHandle,
  getTargetNodeId,
  type NodeState,
} from "./generator-flow-routing";

export function activateStartRoutes(params: {
  pipeline: Pipeline;
  graph: FlowExecutionGraph;
  edgeState: Map<string, EdgeState>;
}) {
  params.pipeline.flow.connections.forEach((connection) => {
    const sourceBlock = params.graph.blockById.get(connection.sourceBlockId);
    const isStartSource =
      connection.sourceBlockId === "flow-start" || sourceBlock?.type === "start";
    if (isStartSource && params.graph.nodeKindById.has(connection.targetBlockId)) {
      params.edgeState.set(connection.id, "activated");
    }
  });
}

export async function* executeSingleRequestNode(params: {
  nodeId: string;
  stepIndex: number;
  step: Pipeline["steps"][number] | null;
  graph: FlowExecutionGraph;
  snapshots: StepSnapshot[];
  runtimeVariables: Record<string, unknown>;
  envVariables: Record<string, string>;
  edgeState: Map<string, EdgeState>;
  nodeState: Map<string, NodeState>;
  finalizedNodeIds: Set<string>;
  options: GeneratorOptions;
}): AsyncGenerator<GeneratorYield, void, Record<string, string> | undefined> {
  if (!params.step) return;
  const alias = params.graph.aliasesByStepId.get(params.nodeId);
  if (!alias) return;

  params.nodeState.set(params.nodeId, "running");
  for await (const yielded of executeStepGenerator(
    params.step,
    params.stepIndex,
    alias,
    params.runtimeVariables,
    params.envVariables,
    params.snapshots,
    params.options,
  )) {
    yield finalizeRequestYield(params, yielded);
  }
}

export async function* executeParallelRequestNodes(params: {
  executableIds: string[];
  stepMap: Map<string, Pipeline["steps"][number]>;
  stepIndexByNodeId: Map<string, number>;
  graph: FlowExecutionGraph;
  snapshots: StepSnapshot[];
  runtimeVariables: Record<string, unknown>;
  envVariables: Record<string, string>;
  edgeState: Map<string, EdgeState>;
  nodeState: Map<string, NodeState>;
  finalizedNodeIds: Set<string>;
  options: GeneratorOptions;
}): AsyncGenerator<GeneratorYield, void, Record<string, string> | undefined> {
  params.executableIds.forEach((nodeId) => params.nodeState.set(nodeId, "running"));
  for await (const yielded of executeParallelStage(
    params.executableIds,
    params.stepMap,
    params.graph.aliasesByStepId,
    Math.min(...params.executableIds.map((nodeId) => params.stepIndexByNodeId.get(nodeId) ?? 0)),
    params.runtimeVariables,
    params.envVariables,
    params.snapshots,
    params.options,
  )) {
    yield finalizeRequestYield(
      {
        ...params,
        nodeId: yielded.snapshot.stepId,
      },
      yielded,
    );
  }
}

export async function* executeConditionNode(params: {
  nodeId: string;
  stepIndex: number;
  graph: FlowExecutionGraph;
  snapshots: StepSnapshot[];
  runtimeVariables: Record<string, unknown>;
  envVariables: Record<string, string>;
  edgeState: Map<string, EdgeState>;
  nodeState: Map<string, NodeState>;
  finalizedNodeIds: Set<string>;
}): AsyncGenerator<GeneratorYield, void, Record<string, string> | undefined> {
  const expression = findConditionExpression(params.graph, params.nodeId, params.snapshots.length);
  const pending = createInitialSnapshot(
    {
      id: params.nodeId,
      name: expression.label,
      method: "GET",
      url: `condition://${params.nodeId}`,
      headers: [],
      params: [],
      body: expression.text,
      bodyType: "raw",
      auth: { type: "none" },
    },
    params.stepIndex,
    "running",
    params.runtimeVariables,
    null,
    "condition",
  );
  pending.startedAt = Date.now();
  params.snapshots.push(pending);
  params.nodeState.set(params.nodeId, "running");
  yield buildYield("step_ready", pending, params.snapshots);

  const evaluated = expression.text
    ? evaluateConditionExpression({
        envVariables: params.envVariables,
        expression: expression.text,
        runtimeVariables: params.runtimeVariables,
      })
    : { error: "Condition expression is empty", result: null, resolvedValue: undefined };
  const chosenHandleId = getConditionOutcomeHandle(evaluated.result);
  const routingDecision = finalizeRoutingDecision({
    chosenHandleId,
    edgeState: params.edgeState,
    finalizedNodeIds: params.finalizedNodeIds,
    graph: params.graph,
    nodeId: params.nodeId,
    nodeState: params.nodeState,
    terminalStatus: evaluated.error ? "error" : "success",
  }) ?? { chosenHandleId, chosenRouteId: null, skippedRouteIds: [] };

  const completed = createConditionCompletedSnapshot({
    base: pending,
    chosenHandleId: routingDecision.chosenHandleId,
    chosenRouteId: routingDecision.chosenRouteId,
    chosenTargetNodeId: getTargetNodeId(params.graph, routingDecision.chosenRouteId),
    error: evaluated.error,
    expression: expression.text,
    resolvedValue: evaluated.resolvedValue,
    result: evaluated.result,
    skippedRouteIds: routingDecision.skippedRouteIds,
    variables: params.runtimeVariables,
  });
  replaceSnapshotByStepId(params.snapshots, params.nodeId, completed);
  yield buildYield("step_complete", completed, params.snapshots);
  if (evaluated.error) yield buildYield("error", completed, params.snapshots);
}

function finalizeRequestYield(
  params: {
    nodeId: string;
    graph: FlowExecutionGraph;
    snapshots: StepSnapshot[];
    edgeState: Map<string, EdgeState>;
    nodeState: Map<string, NodeState>;
    finalizedNodeIds: Set<string>;
  },
  yielded: GeneratorYield,
) {
  if (yielded.type !== "step_complete" && yielded.type !== "error") return yielded;

  const routingDecision =
    finalizeRoutingDecision({
      chosenHandleId: getRequestOutcomeHandle(yielded.snapshot.status),
      edgeState: params.edgeState,
      finalizedNodeIds: params.finalizedNodeIds,
      graph: params.graph,
      nodeId: params.nodeId,
      nodeState: params.nodeState,
      terminalStatus: yielded.snapshot.status,
    }) ??
    getSnapshotByStepId(params.snapshots, params.nodeId)?.routeDecision ??
    null;

  return attachRouteDecisionToYield({
    nodeId: params.nodeId,
    routingDecision,
    snapshots: params.snapshots,
    yielded,
  });
}

function findConditionExpression(graph: FlowExecutionGraph, nodeId: string, fallbackIndex: number) {
  const block = graph.blockById.get(nodeId);
  return {
    label:
      block?.type === "evaluate"
        ? block.data.label?.trim() || `Condition ${fallbackIndex + 1}`
        : `Condition ${fallbackIndex + 1}`,
    text: block?.type === "evaluate" ? block.data.expression?.trim() || "" : "",
  };
}
