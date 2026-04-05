import type { Pipeline } from "@/types";
import type { GeneratorYield, StepSnapshot } from "@/types/pipeline-runtime";
import { cloneRuntimeVariables, type GeneratorOptions } from "./generator-executor-shared";
import { buildFlowExecutionGraph } from "./flow-execution-graph";
import { type EdgeState, getNodeEligibility, type NodeState } from "./generator-flow-routing";
import {
  activateStartRoutes,
  executeConditionNode,
  executeParallelRequestNodes,
  executeSingleRequestNode,
} from "./generator-flow-runner";

export async function* createFlowPipelineGenerator(
  pipeline: Pipeline,
  envVariables: Record<string, string>,
  options: GeneratorOptions,
): AsyncGenerator<GeneratorYield, void, Record<string, string> | undefined> {
  const graph = buildFlowExecutionGraph(pipeline);
  if (!graph) return;

  const stepMap = new Map(pipeline.steps.map((step) => [step.id, step]));
  const snapshots: StepSnapshot[] = [];
  const runtimeVariables = cloneRuntimeVariables(options.initialRuntimeVariables);
  const edgeState = new Map<string, EdgeState>();
  const nodeState = new Map<string, NodeState>(
    graph.orderedNodeIds.map((nodeId) => [nodeId, "idle"]),
  );
  const finalizedNodeIds = new Set<string>();
  const stepIndexByNodeId = new Map(graph.orderedNodeIds.map((nodeId, index) => [nodeId, index]));
  const getStepIndex = (nodeId: string) => stepIndexByNodeId.get(nodeId) ?? snapshots.length;

  activateStartRoutes({ graph, edgeState, pipeline });

  while (true) {
    const runnable = graph.orderedNodeIds.filter(
      (nodeId) => getNodeEligibility({ edgeState, graph, nodeId, nodeState }) === "runnable",
    );
    if (runnable.length === 0) break;

    const nextConditionId = runnable.find(
      (nodeId) => graph.nodeKindById.get(nodeId) === "condition",
    );
    if (nextConditionId) {
      yield* executeConditionNode({
        edgeState,
        envVariables,
        finalizedNodeIds,
        graph,
        nodeId: nextConditionId,
        nodeState,
        runtimeVariables,
        snapshots,
        stepIndex: getStepIndex(nextConditionId),
      });
      continue;
    }

    const executableIds = runnable.filter((nodeId) => graph.executableStepIds.has(nodeId));
    if (executableIds.length === 1) {
      const nodeId = executableIds[0]!;
      yield* executeSingleRequestNode({
        edgeState,
        envVariables,
        finalizedNodeIds,
        graph,
        nodeId,
        nodeState,
        options,
        runtimeVariables,
        snapshots,
        step: stepMap.get(nodeId) ?? null,
        stepIndex: getStepIndex(nodeId),
      });
      continue;
    }

    yield* executeParallelRequestNodes({
      edgeState,
      envVariables,
      executableIds,
      finalizedNodeIds,
      graph,
      nodeState,
      options,
      runtimeVariables,
      snapshots,
      stepMap,
      stepIndexByNodeId,
    });
  }
}
