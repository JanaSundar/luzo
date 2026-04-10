"use client";

import type { Pipeline } from "@/types";
import type { PipelineExecutionEvent } from "@/types/pipeline-runtime";
import type { CompilePlanOutput, Result } from "@/types/worker-results";
import type { CompiledPipelineNode, CompiledPipelinePlan } from "@/types/workflow";
import { graphWorkerClient } from "@/workers/client/graph-client";
import { buildWorkflowBundleFromPipeline } from "@/features/workflow/pipeline-adapters";
import { markSkippedSubgraph } from "./branch-skipping";

export async function resolveCompiledPlan(
  pipeline: Pipeline,
  cachedPlan?: CompiledPipelinePlan,
): Promise<CompilePlanOutput | CompiledPipelinePlan | null> {
  if (cachedPlan) return cachedPlan;

  const bundle = buildWorkflowBundleFromPipeline(pipeline);
  const res = await graphWorkerClient.callLatest<Result<CompilePlanOutput>>(
    "pipeline-compilation",
    async (api) =>
      api.compileExecutionPlan({
        workflow: bundle.workflow,
        registry: bundle.registry,
      }),
  );

  if (!res?.ok) return null;
  if (res.data.warnings.some((warning) => warning.severity === "error")) return null;
  return res.data;
}

export function primeRuntimeState(
  plan: CompiledPipelinePlan,
  startStepId: string | undefined,
  completed: Set<string>,
  activatedDeps: Map<string, Set<string>>,
  skipped: Set<string>,
) {
  if (!startStepId) return;

  const startIndex = plan.order.indexOf(startStepId);
  if (startIndex === -1) throw new Error("Invalid startStepId");

  for (const nodeId of plan.order.slice(0, startIndex)) {
    completed.add(nodeId);
    const node = plan.nodes.find((candidate) => candidate.nodeId === nodeId);

    // For condition nodes: follow both branches so downstream nodes can be activated.
    // We don't know the original result, so treat both paths as potentially taken.
    // For switch nodes: follow all case routes for the same reason.
    const primeTargets =
      node?.kind === "condition"
        ? [...(node.routes.true ?? []), ...(node.routes.false ?? [])]
        : node?.kind === "switch"
          ? node.runtimeRoutes.map((r) => r.targetId)
          : node?.routes.success.length
            ? node.routes.success
            : (node?.routes.control ?? []);

    for (const targetId of primeTargets) {
      const deps = activatedDeps.get(targetId) ?? new Set<string>();
      deps.add(nodeId);
      activatedDeps.set(targetId, deps);
    }
  }

  skipped.clear();
}

export function seedReadyQueue(
  plan: CompiledPipelinePlan,
  startStepId: string | undefined,
  planNodeMap: Map<string, CompiledPipelineNode>,
  queued: Set<string>,
) {
  const startIndex = startStepId ? Math.max(0, plan.order.indexOf(startStepId)) : 0;
  const seeded = plan.order.slice(startIndex).filter((nodeId) => {
    const node = planNodeMap.get(nodeId);
    return (node?.dependencyIds.length ?? 0) === 0 || nodeId === startStepId;
  });

  for (const nodeId of seeded) queued.add(nodeId);
  return seeded;
}

export function takeStage(
  readyQueue: string[],
  queued: Set<string>,
  planNodeMap: Map<string, CompiledPipelineNode>,
  stageIndex: number,
) {
  const stage = readyQueue.filter(
    (nodeId) => (planNodeMap.get(nodeId)?.stageIndex ?? 0) === stageIndex,
  );
  for (const nodeId of stage) {
    const queueIndex = readyQueue.indexOf(nodeId);
    if (queueIndex >= 0) readyQueue.splice(queueIndex, 1);
    queued.delete(nodeId);
  }
  return stage;
}

export function isTerminalStepEvent(
  event: PipelineExecutionEvent,
): event is Extract<
  PipelineExecutionEvent,
  {
    type:
      | "step_completed"
      | "step_failed"
      | "condition_evaluated"
      | "switch_evaluated"
      | "delay_elapsed"
      | "end_reached";
  }
> {
  return (
    event.type === "step_completed" ||
    event.type === "step_failed" ||
    event.type === "condition_evaluated" ||
    event.type === "switch_evaluated" ||
    event.type === "delay_elapsed" ||
    event.type === "end_reached"
  );
}

export function processCompletion(
  event: Extract<
    PipelineExecutionEvent,
    {
      type:
        | "step_completed"
        | "step_failed"
        | "condition_evaluated"
        | "switch_evaluated"
        | "delay_elapsed"
        | "end_reached";
    }
  >,
  nodeId: string,
  planNodeMap: Map<string, CompiledPipelineNode>,
  activatedDeps: Map<string, Set<string>>,
  completed: Set<string>,
  skipped: Set<string>,
  readyQueue: string[],
  queued: Set<string>,
  conditionResults: Map<string, boolean>,
) {
  completed.add(nodeId);
  const planNode = planNodeMap.get(nodeId);
  if (!planNode) return;

  let nextTargets: string[];

  if (event.type === "condition_evaluated") {
    conditionResults.set(nodeId, event.result);
    nextTargets = event.result ? planNode.routes.true : planNode.routes.false;
    // Fall through to control if the matched path has no edges configured.
    if (nextTargets.length === 0) nextTargets = planNode.routes.control;
    const skippedTargets = event.result ? planNode.routes.false : planNode.routes.true;
    skippedTargets.forEach((targetId) =>
      markSkippedSubgraph(targetId, planNodeMap, completed, skipped, readyQueue, queued),
    );
  } else if (event.type === "switch_evaluated") {
    const matchedId = event.matchedCaseId;
    const matchedRoute = matchedId
      ? planNode.runtimeRoutes.filter((r) => r.semantics === matchedId).map((r) => r.targetId)
      : [];
    nextTargets = matchedRoute.length > 0 ? matchedRoute : planNode.routes.control;
    const skippedRoutes = planNode.runtimeRoutes
      .filter((r) => r.semantics !== matchedId && r.semantics !== "control")
      .map((r) => r.targetId);
    skippedRoutes.forEach((targetId) =>
      markSkippedSubgraph(targetId, planNodeMap, completed, skipped, readyQueue, queued),
    );
  } else if (event.type === "delay_elapsed" || event.type === "end_reached") {
    nextTargets = planNode.routes.control;
  } else {
    nextTargets =
      event.type === "step_failed"
        ? planNode.routes.failure
        : planNode.routes.success.length > 0
          ? planNode.routes.success
          : planNode.routes.control;
    const skippedTargets =
      event.type === "step_failed" ? planNode.routes.success : planNode.routes.failure;
    skippedTargets.forEach((targetId) =>
      markSkippedSubgraph(targetId, planNodeMap, completed, skipped, readyQueue, queued),
    );
  }

  for (const targetId of nextTargets) {
    const deps = activatedDeps.get(targetId) ?? new Set<string>();
    deps.add(nodeId);
    activatedDeps.set(targetId, deps);
    if (!queued.has(targetId) && !readyQueue.includes(targetId)) {
      readyQueue.push(targetId);
      queued.add(targetId);
    }
  }
}

export function promoteReadyNodes(
  planNodeMap: Map<string, CompiledPipelineNode>,
  activatedDeps: Map<string, Set<string>>,
  completed: Set<string>,
  skipped: Set<string>,
  readyQueue: string[],
  queued: Set<string>,
) {
  const filtered = readyQueue.filter((nodeId) => {
    const node = planNodeMap.get(nodeId);
    if (!node) return false;
    if (node.dependencyIds.length === 0) return true;

    const activated = activatedDeps.get(nodeId) ?? new Set<string>();
    return node.dependencyIds.every(
      (depId) => skipped.has(depId) || (completed.has(depId) && activated.has(depId)),
    );
  });

  readyQueue.splice(
    0,
    readyQueue.length,
    ...filtered.sort((a, b) => {
      const stageDiff =
        (planNodeMap.get(a)?.stageIndex ?? 0) - (planNodeMap.get(b)?.stageIndex ?? 0);
      return stageDiff !== 0 ? stageDiff : a.localeCompare(b);
    }),
  );

  for (const nodeId of Array.from(queued)) {
    if (!readyQueue.includes(nodeId)) queued.delete(nodeId);
  }
}
