"use client";

import type { Pipeline } from "@/types";
import type { PipelineExecutionEvent } from "@/types/pipeline-runtime";
import type { CompilePlanOutput, Result } from "@/types/worker-results";
import type { CompiledPipelineNode, CompiledPipelinePlan } from "@/types/workflow";
import { graphWorkerClient } from "@/workers/client/graph-client";
import { buildWorkflowBundleFromPipeline } from "@/features/workflow/pipeline-adapters";

export async function resolveCompiledPlan(
  pipeline: Pipeline,
  cachedPlan?: CompiledPipelinePlan,
): Promise<CompiledPipelinePlan | null> {
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
  return res.data.plan;
}

export function primeRuntimeState(
  plan: CompiledPipelinePlan,
  startStepId: string | undefined,
  completed: Set<string>,
  activatedDeps: Map<string, Set<string>>,
) {
  if (!startStepId) return;

  const startIndex = plan.order.indexOf(startStepId);
  if (startIndex === -1) throw new Error("Invalid startStepId");

  for (const nodeId of plan.order.slice(0, startIndex)) {
    completed.add(nodeId);
    const node = plan.nodes.find((candidate) => candidate.nodeId === nodeId);
    const successTargets = node?.routes.success.length
      ? node.routes.success
      : (node?.routes.control ?? []);

    for (const targetId of successTargets) {
      const deps = activatedDeps.get(targetId) ?? new Set<string>();
      deps.add(nodeId);
      activatedDeps.set(targetId, deps);
    }
  }
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
): event is Extract<PipelineExecutionEvent, { type: "step_completed" | "step_failed" }> {
  return event.type === "step_completed" || event.type === "step_failed";
}

export function processCompletion(
  event: Extract<PipelineExecutionEvent, { type: "step_completed" | "step_failed" }>,
  nodeId: string,
  planNodeMap: Map<string, CompiledPipelineNode>,
  activatedDeps: Map<string, Set<string>>,
  completed: Set<string>,
  readyQueue: string[],
  queued: Set<string>,
) {
  completed.add(nodeId);
  const planNode = planNodeMap.get(nodeId);
  if (!planNode) return;

  const nextTargets =
    event.type === "step_failed"
      ? planNode.routes.failure
      : planNode.routes.success.length > 0
        ? planNode.routes.success
        : planNode.routes.control;

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
  readyQueue: string[],
  queued: Set<string>,
) {
  const filtered = readyQueue.filter((nodeId) => {
    const node = planNodeMap.get(nodeId);
    if (!node) return false;
    if (node.dependencyIds.length === 0) return true;

    const activated = activatedDeps.get(nodeId) ?? new Set<string>();
    return node.dependencyIds.every((depId) => completed.has(depId) && activated.has(depId));
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
