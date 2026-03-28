import type { Pipeline } from "@/types";
import type {
  PipelineExecutionEvent,
  PipelineRuntime,
  StepAlias,
  StepSnapshot,
} from "@/types/pipeline-runtime";
import type { CompiledPipelineNode } from "@/types/workflow";
import { cloneRuntimeVariables, type GeneratorOptions } from "./generator-executor-shared";
import {
  isTerminalStepEvent,
  primeRuntimeState,
  processCompletion,
  promoteReadyNodes,
  resolveCompiledPlan,
  seedReadyQueue,
  takeStage,
} from "./generator-executor-plan";
import { executeParallelStage, executeStepGenerator } from "./generator-step-executor";

export type GeneratorExecutorModule = typeof import("./generator-executor");

export async function* createPipelineGenerator(
  pipeline: Pipeline,
  envVariables: Record<string, string>,
  options: GeneratorOptions,
): PipelineRuntime {
  const compiledPlan = await resolveCompiledPlan(pipeline, options.compiledPlan);
  if (!compiledPlan) return;

  yield {
    type: "execution_started",
    startedAt: Date.now(),
    totalSteps: compiledPlan.order.length,
  } satisfies PipelineExecutionEvent;

  const stepMap = new Map(pipeline.steps.map((step) => [step.id, step] as const));
  const aliasMap = new Map(compiledPlan.aliases.map((alias) => [alias.stepId, alias]));
  const planNodeMap = new Map<string, CompiledPipelineNode>(
    compiledPlan.nodes.map((node) => [node.nodeId, node]),
  );
  const snapshots: import("@/types/pipeline-runtime").StepSnapshot[] = [];
  const runtimeVariables = cloneRuntimeVariables(options.initialRuntimeVariables);
  const completed = new Set<string>();
  const queued = new Set<string>();
  const activatedDeps = new Map<string, Set<string>>();

  primeRuntimeState(compiledPlan, options.startStepId, completed, activatedDeps);
  const readyQueue = seedReadyQueue(compiledPlan, options.startStepId, planNodeMap, queued);

  while (readyQueue.length > 0) {
    if (options.masterAbort.signal.aborted) {
      yield interruptedEvent();
      return;
    }

    const stageIndex = Math.min(
      ...readyQueue.map((nodeId) => planNodeMap.get(nodeId)?.stageIndex ?? 0),
    );
    const stage = takeStage(readyQueue, queued, planNodeMap, stageIndex);

    if (options.useStream || stage.length === 1) {
      yield* runSingleStage(
        stage,
        compiledPlan.order,
        stepMap,
        aliasMap,
        planNodeMap,
        runtimeVariables,
        envVariables,
        snapshots,
        options,
        activatedDeps,
        completed,
        readyQueue,
        queued,
      );
      continue;
    }

    yield* runParallelStage(
      stage,
      stepMap,
      aliasMap,
      planNodeMap,
      runtimeVariables,
      envVariables,
      snapshots,
      options,
      activatedDeps,
      completed,
      readyQueue,
      queued,
    );
  }

  yield { type: "execution_completed", completedAt: Date.now() } satisfies PipelineExecutionEvent;
}

async function* runSingleStage(
  stage: string[],
  orderedNodeIds: string[],
  stepMap: Map<string, Pipeline["steps"][number]>,
  aliasMap: Map<string, StepAlias>,
  planNodeMap: Map<string, CompiledPipelineNode>,
  runtimeVariables: Record<string, unknown>,
  envVariables: Record<string, string>,
  snapshots: StepSnapshot[],
  options: GeneratorOptions,
  activatedDeps: Map<string, Set<string>>,
  completed: Set<string>,
  readyQueue: string[],
  queued: Set<string>,
): PipelineRuntime {
  for (const nodeId of stage) {
    const step = stepMap.get(nodeId);
    if (!step) continue;

    const stepIndex = planNodeMap.get(nodeId)?.orderIndex ?? orderedNodeIds.indexOf(nodeId);
    for await (const event of executeStepGenerator(
      step,
      stepIndex,
      aliasMap.get(step.id) ?? {
        alias: "reqUnknown",
        index: stepIndex,
        refs: ["reqUnknown"],
        stepId: step.id,
      },
      runtimeVariables,
      envVariables,
      snapshots,
      options,
    )) {
      yield event;
      if (!isTerminalStepEvent(event)) continue;
      processCompletion(event, nodeId, planNodeMap, activatedDeps, completed, readyQueue, queued);
      promoteReadyNodes(planNodeMap, activatedDeps, completed, readyQueue, queued);
    }
  }
}

async function* runParallelStage(
  stage: string[],
  stepMap: Map<string, Pipeline["steps"][number]>,
  aliasMap: Map<string, StepAlias>,
  planNodeMap: Map<string, CompiledPipelineNode>,
  runtimeVariables: Record<string, unknown>,
  envVariables: Record<string, string>,
  snapshots: StepSnapshot[],
  options: GeneratorOptions,
  activatedDeps: Map<string, Set<string>>,
  completed: Set<string>,
  readyQueue: string[],
  queued: Set<string>,
): PipelineRuntime {
  const startIndex = planNodeMap.get(stage[0] ?? "")?.orderIndex ?? 0;
  for await (const event of executeParallelStage(
    stage,
    stepMap,
    aliasMap,
    startIndex,
    runtimeVariables,
    envVariables,
    snapshots,
    options,
  )) {
    yield event;
    if (!isTerminalStepEvent(event)) continue;
    processCompletion(
      event,
      event.snapshot.stepId,
      planNodeMap,
      activatedDeps,
      completed,
      readyQueue,
      queued,
    );
  }
  promoteReadyNodes(planNodeMap, activatedDeps, completed, readyQueue, queued);
}

function interruptedEvent(): PipelineExecutionEvent {
  return {
    type: "execution_interrupted",
    completedAt: Date.now(),
    reason: "Pipeline aborted",
  };
}
