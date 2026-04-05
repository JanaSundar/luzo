import type { Pipeline } from "@/types";
import type { GeneratorYield, StepSnapshot } from "@/types/pipeline-runtime";
import { buildStepAliases, validatePipelineDag } from "./dag-validator";
import { getExecutionStages } from "./dag-stages";
import {
  type GeneratorOptions,
  cloneRuntimeVariables,
  buildYield,
} from "./generator-executor-shared";
import { buildFlowExecutionGraph } from "./flow-execution-graph";
import { createFlowPipelineGenerator } from "./generator-flow-executor";
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
  if (buildFlowExecutionGraph(pipeline)) {
    yield* createFlowPipelineGenerator(pipeline, envVariables, options);
    return;
  }

  const validation = validatePipelineDag(pipeline.steps);
  if (!validation.valid || !validation.sortedStepIds) return;

  const startIndex = options.startStepId
    ? validation.sortedStepIds.indexOf(options.startStepId)
    : 0;
  if (options.startStepId && startIndex === -1) throw new Error("Invalid startStepId");

  const stepIds = validation.sortedStepIds.slice(startIndex);
  const stepMap = new Map(pipeline.steps.map((step) => [step.id, step]));
  const aliasMap = new Map(buildStepAliases(pipeline.steps).map((alias) => [alias.stepId, alias]));
  const snapshots: StepSnapshot[] = [];
  const runtimeVariables = cloneRuntimeVariables(options.initialRuntimeVariables);

  if (options.useStream) {
    for (let i = 0; i < stepIds.length; i++) {
      const step = stepMap.get(stepIds[i]!);
      if (!step) continue;
      if (options.masterAbort.signal.aborted) {
        yield buildAbortResult(step, startIndex + i, runtimeVariables, snapshots);
        return;
      }

      yield* executeStepGenerator(
        step,
        startIndex + i,
        aliasMap.get(step.id) ?? {
          alias: "reqUnknown",
          index: i,
          refs: ["reqUnknown"],
          stepId: step.id,
        },
        runtimeVariables,
        envVariables,
        snapshots,
        options,
      );
    }
    return;
  }

  const stages = getExecutionStages(stepIds, validation.adjacency ?? new Map());
  let stageOffset = startIndex;

  for (const stage of stages) {
    const firstStep = stepMap.get(stage[0] ?? "");
    if (options.masterAbort.signal.aborted && firstStep) {
      yield buildAbortResult(firstStep, stageOffset, runtimeVariables, snapshots);
      return;
    }

    if (stage.length === 1) {
      const step = firstStep;
      if (step) {
        yield* executeStepGenerator(
          step,
          stageOffset,
          aliasMap.get(step.id) ?? {
            alias: "reqUnknown",
            index: stageOffset,
            refs: ["reqUnknown"],
            stepId: step.id,
          },
          runtimeVariables,
          envVariables,
          snapshots,
          options,
        );
      }
    } else {
      yield* executeParallelStage(
        stage,
        stepMap,
        aliasMap,
        stageOffset,
        runtimeVariables,
        envVariables,
        snapshots,
        options,
      );
    }

    stageOffset += stage.length;
  }
}
