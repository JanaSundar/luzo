import type { Pipeline } from "@/types";
import type { GeneratorYield, StepSnapshot } from "@/types/pipeline-runtime";
import type { Result, CompilePlanOutput } from "@/types/worker-results";
import type { ExecutionPlanNode } from "@/types/workflow";
import { graphWorkerClient } from "@/workers/client/graph-client";
import { buildWorkflowBundleFromPipeline } from "@/features/workflow/pipeline-adapters";
import { buildStepAliases } from "./dag-validator";
import {
  type GeneratorOptions,
  cloneRuntimeVariables,
  buildYield,
} from "./generator-executor-shared";
import { executeParallelStage, executeStepGenerator } from "./generator-step-executor";
import { createInitialSnapshot } from "./pipeline-snapshot-utils";

export type GeneratorExecutorModule = typeof import("./generator-executor");

function buildAbortResult(
  step: Pipeline["steps"][number],
  stepIndex: number,
  runtimeVariables: Record<string, unknown>,
  snapshots: StepSnapshot[],
): GeneratorYield {
  const snapshot = createInitialSnapshot(
    step,
    stepIndex,
    "error",
    runtimeVariables,
    "Pipeline aborted",
  );
  snapshot.streamStatus = "error";
  snapshot.streamChunks = [];
  snapshots.push(snapshot);
  return buildYield("error", snapshot, snapshots);
}

export async function* createPipelineGenerator(
  pipeline: Pipeline,
  envVariables: Record<string, string>,
  options: GeneratorOptions,
): AsyncGenerator<GeneratorYield, void, Record<string, string> | undefined> {
  const bundle = buildWorkflowBundleFromPipeline(pipeline);
  const res = await graphWorkerClient.callLatest<Result<CompilePlanOutput>>(
    "pipeline-compilation",
    async (api) =>
      api.compileExecutionPlan({
        workflow: bundle.workflow,
        registry: bundle.registry,
      }),
  );

  if (!res?.ok) return;
  const { plan, warnings } = res.data;

  if (warnings.some((warning) => warning.severity === "error")) return;

  const startIndex = options.startStepId ? plan.order.indexOf(options.startStepId) : 0;
  if (options.startStepId && startIndex === -1) throw new Error("Invalid startStepId");

  const stepIds = plan.order.slice(startIndex);
  const stepMap = new Map<string, Pipeline["steps"][number]>(
    pipeline.steps.map((step) => [step.id, step]),
  );
  const aliasMap = new Map(buildStepAliases(pipeline.steps).map((alias) => [alias.stepId, alias]));
  const planNodeMap = new Map<string, ExecutionPlanNode>(
    plan.nodes.map((node) => [node.nodeId, node]),
  );
  const snapshots: StepSnapshot[] = [];
  const runtimeVariables = cloneRuntimeVariables(options.initialRuntimeVariables);
  const completed = new Set<string>();
  const queued = new Set<string>();
  const activatedDeps = new Map<string, Set<string>>();

  const readyQueue = seedReadyQueue(stepIds, planNodeMap, queued);

  while (readyQueue.length > 0) {
    const stageIndex = Math.min(
      ...readyQueue.map((nodeId) => planNodeMap.get(nodeId)?.stageIndex ?? 0),
    );
    const stage = readyQueue.filter(
      (nodeId) => (planNodeMap.get(nodeId)?.stageIndex ?? 0) === stageIndex,
    );
    for (const nodeId of stage) {
      const queueIndex = readyQueue.indexOf(nodeId);
      if (queueIndex >= 0) readyQueue.splice(queueIndex, 1);
      queued.delete(nodeId);
    }

    const firstStep = stepMap.get(stage[0] ?? "");
    if (options.masterAbort.signal.aborted && firstStep) {
      yield buildAbortResult(firstStep, stageIndex, runtimeVariables, snapshots);
      return;
    }

    if (options.useStream || stage.length === 1) {
      for (const nodeId of stage) {
        const step = stepMap.get(nodeId);
        if (!step) continue;
        for await (const yielded of executeStepGenerator(
          step,
          plan.order.indexOf(nodeId),
          aliasMap.get(step.id) ?? {
            alias: "reqUnknown",
            index: plan.order.indexOf(nodeId),
            refs: ["reqUnknown"],
            stepId: step.id,
          },
          runtimeVariables,
          envVariables,
          snapshots,
          options,
        )) {
          yield yielded;
          const processedSnapshot = processCompletion(
            yielded,
            nodeId,
            planNodeMap,
            activatedDeps,
            completed,
            readyQueue,
            queued,
          );
          if (processedSnapshot) {
            promoteReadyNodes(planNodeMap, activatedDeps, completed, readyQueue, queued);
          }
        }
      }
      continue;
    }

    for await (const yielded of executeParallelStage(
      stage,
      stepMap,
      aliasMap,
      plan.order.indexOf(stage[0] ?? ""),
      runtimeVariables,
      envVariables,
      snapshots,
      options,
    )) {
      yield yielded;
      if (yielded.type === "step_complete" || yielded.type === "error") {
        processCompletion(
          yielded,
          yielded.snapshot.stepId,
          planNodeMap,
          activatedDeps,
          completed,
          readyQueue,
          queued,
        );
      }
    }
    promoteReadyNodes(planNodeMap, activatedDeps, completed, readyQueue, queued);
  }
}

function processCompletion(
  yielded: GeneratorYield,
  nodeId: string,
  planNodeMap: Map<string, ExecutionPlanNode>,
  activatedDeps: Map<string, Set<string>>,
  completed: Set<string>,
  readyQueue: string[],
  queued: Set<string>,
) {
  if (yielded.type !== "step_complete" && yielded.type !== "error") return null;
  completed.add(nodeId);
  const planNode = planNodeMap.get(nodeId);
  if (!planNode) return yielded.snapshot;
  const outcome = yielded.snapshot.status === "error" ? "failure" : "success";
  const nextTargets =
    outcome === "failure"
      ? (planNode.routes?.failure ?? [])
      : ((planNode.routes?.success?.length ? planNode.routes.success : planNode.routes?.control) ??
        []);

  for (const targetId of nextTargets) {
    const deps = activatedDeps.get(targetId) ?? new Set<string>();
    deps.add(nodeId);
    activatedDeps.set(targetId, deps);
    if (!queued.has(targetId) && !readyQueue.includes(targetId)) {
      readyQueue.push(targetId);
      queued.add(targetId);
    }
  }
  return yielded.snapshot;
}

function promoteReadyNodes(
  planNodeMap: Map<string, ExecutionPlanNode>,
  activatedDeps: Map<string, Set<string>>,
  completed: Set<string>,
  readyQueue: string[],
  queued: Set<string>,
) {
  const filtered = readyQueue.filter((nodeId) => {
    const node = planNodeMap.get(nodeId);
    if (!node) return false;
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

function seedReadyQueue(
  stepIds: string[],
  planNodeMap: Map<string, ExecutionPlanNode>,
  queued: Set<string>,
) {
  const seeded = stepIds.filter(
    (nodeId) => (planNodeMap.get(nodeId)?.dependencyIds.length ?? 0) === 0,
  );
  for (const nodeId of seeded) queued.add(nodeId);
  return seeded;
}
