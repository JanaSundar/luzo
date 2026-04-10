import type { Pipeline } from "@/types";
import type { PipelineExecutionEvent, StepAlias, StepSnapshot } from "@/types/pipeline-runtime";
import type { CompiledPipelineNode } from "@/types/workflow";
import { executeAssertGenerator } from "./assert-step-executor";
import { executeConditionGenerator } from "./condition-step-executor";
import { executeDelayGenerator } from "./delay-step-executor";
import { executeEndGenerator } from "./end-step-executor";
import { executeForEachGenerator } from "./forEach-step-executor";
import {
  isTerminalStepEvent,
  processCompletion,
  promoteReadyNodes,
} from "./generator-executor-plan";
import { type GeneratorOptions } from "./generator-executor-shared";
import { executeStepGenerator } from "./generator-step-executor";
import { executeLogGenerator } from "./log-step-executor";
import { executePollGenerator } from "./poll-step-executor";
import { executeSwitchGenerator } from "./switch-step-executor";
import { executeTransformGenerator } from "./transform-step-executor";
import { executeWebhookWaitGenerator } from "./webhookWait-step-executor";

interface DispatchContext {
  activatedDeps: Map<string, Set<string>>;
  completed: Set<string>;
  conditionResults: Map<string, boolean>;
  envVariables: Record<string, string>;
  options: GeneratorOptions;
  planNodeMap: Map<string, CompiledPipelineNode>;
  queued: Set<string>;
  readyQueue: string[];
  runtimeVariables: Record<string, unknown>;
  skipped: Set<string>;
  snapshots: StepSnapshot[];
}

export async function* executeSingleNode(
  nodeId: string,
  orderedNodeIds: string[],
  stepMap: Map<string, Pipeline["steps"][number]>,
  aliasMap: Map<string, StepAlias>,
  planNodeMap: Map<string, CompiledPipelineNode>,
  context: DispatchContext,
): AsyncGenerator<PipelineExecutionEvent, void, unknown> {
  const planNode = planNodeMap.get(nodeId);
  const orderIndex = planNode?.orderIndex ?? orderedNodeIds.indexOf(nodeId);

  if (planNode?.kind === "condition" && planNode.conditionConfig) {
    return yield* runAndCommit(
      executeConditionGenerator({
        nodeId,
        orderIndex,
        conditionConfig: planNode.conditionConfig,
        runtimeVariables: context.runtimeVariables,
        envVariables: context.envVariables,
        snapshots: context.snapshots,
        pauseBeforeEvaluate: context.options.useStream,
      }),
      nodeId,
      context,
    );
  }

  if (planNode?.kind === "delay" && planNode.delayConfig) {
    return yield* runAndCommit(
      executeDelayGenerator({
        nodeId,
        orderIndex,
        delayConfig: planNode.delayConfig,
        runtimeVariables: context.runtimeVariables,
        snapshots: context.snapshots,
      }),
      nodeId,
      context,
    );
  }

  if (planNode?.kind === "end") {
    return yield* runAndCommit(
      executeEndGenerator({
        nodeId,
        orderIndex,
        label: "End",
        runtimeVariables: context.runtimeVariables,
        snapshots: context.snapshots,
      }),
      nodeId,
      context,
    );
  }

  if (planNode?.kind === "forEach" && planNode.forEachConfig) {
    return yield* runAndCommit(
      executeForEachGenerator({
        nodeId,
        orderIndex,
        forEachConfig: planNode.forEachConfig,
        runtimeVariables: context.runtimeVariables,
        snapshots: context.snapshots,
        executionId: context.options.executionId ?? nodeId,
      }),
      nodeId,
      context,
    );
  }

  if (planNode?.kind === "transform" && planNode.transformConfig) {
    return yield* runAndCommit(
      executeTransformGenerator({
        nodeId,
        orderIndex,
        transformConfig: planNode.transformConfig,
        transformAlias: aliasMap.get(nodeId) ?? {
          alias: "reqUnknown",
          index: orderIndex,
          refs: ["reqUnknown", nodeId],
          stepId: nodeId,
        },
        runtimeVariables: context.runtimeVariables,
        snapshots: context.snapshots,
      }),
      nodeId,
      context,
    );
  }

  if (planNode?.kind === "log" && planNode.logConfig) {
    return yield* runAndCommit(
      executeLogGenerator({
        nodeId,
        orderIndex,
        logConfig: planNode.logConfig,
        runtimeVariables: context.runtimeVariables,
        snapshots: context.snapshots,
        executionId: context.options.executionId ?? nodeId,
      }),
      nodeId,
      context,
    );
  }

  if (planNode?.kind === "assert" && planNode.assertConfig) {
    return yield* runAndCommit(
      executeAssertGenerator({
        nodeId,
        orderIndex,
        assertConfig: planNode.assertConfig,
        runtimeVariables: context.runtimeVariables,
        envVariables: context.envVariables,
        snapshots: context.snapshots,
        executionId: context.options.executionId ?? nodeId,
      }),
      nodeId,
      context,
    );
  }

  if (planNode?.kind === "webhookWait" && planNode.webhookWaitConfig) {
    return yield* runAndCommit(
      executeWebhookWaitGenerator({
        nodeId,
        orderIndex,
        webhookWaitConfig: planNode.webhookWaitConfig,
        webhookAlias: aliasMap.get(nodeId) ?? {
          alias: "webhook1",
          index: orderIndex,
          refs: ["webhook1", "reqUnknown", nodeId],
          stepId: nodeId,
        },
        runtimeVariables: context.runtimeVariables,
        snapshots: context.snapshots,
        executionId: context.options.executionId ?? nodeId,
        masterAbort: context.options.masterAbort,
      }),
      nodeId,
      context,
    );
  }

  if (planNode?.kind === "poll" && planNode.pollConfig) {
    return yield* runAndCommit(
      executePollGenerator({
        nodeId,
        orderIndex,
        pollConfig: planNode.pollConfig,
        runtimeVariables: context.runtimeVariables,
        envVariables: context.envVariables,
        snapshots: context.snapshots,
        executionId: context.options.executionId ?? nodeId,
        masterAbort: context.options.masterAbort,
      }),
      nodeId,
      context,
    );
  }

  if (planNode?.kind === "switch" && planNode.switchConfig) {
    return yield* runAndCommit(
      executeSwitchGenerator({
        nodeId,
        orderIndex,
        switchConfig: planNode.switchConfig,
        runtimeVariables: context.runtimeVariables,
        envVariables: context.envVariables,
        snapshots: context.snapshots,
        pauseBeforeEvaluate: context.options.useStream,
      }),
      nodeId,
      context,
    );
  }

  const step = stepMap.get(nodeId);
  if (!step) return;

  yield* runAndCommit(
    executeStepGenerator(
      step,
      orderIndex,
      aliasMap.get(step.id) ?? {
        alias: "reqUnknown",
        index: orderIndex,
        refs: ["reqUnknown"],
        stepId: step.id,
      },
      context.runtimeVariables,
      context.envVariables,
      context.snapshots,
      context.options,
    ),
    nodeId,
    context,
  );
}

async function* runAndCommit(
  generator: AsyncGenerator<PipelineExecutionEvent, void, Record<string, string> | undefined>,
  nodeId: string,
  context: DispatchContext,
): AsyncGenerator<PipelineExecutionEvent, void, unknown> {
  for await (const event of generator) {
    yield event;
    if (!isTerminalStepEvent(event)) continue;
    processCompletion(
      event,
      nodeId,
      context.planNodeMap,
      context.activatedDeps,
      context.completed,
      context.skipped,
      context.readyQueue,
      context.queued,
      context.conditionResults,
    );
    promoteReadyNodes(
      context.planNodeMap,
      context.activatedDeps,
      context.completed,
      context.skipped,
      context.readyQueue,
      context.queued,
    );
  }
}
