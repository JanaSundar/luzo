import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { buildExecutionPipelineFromCompileOutput } from "@/features/workflow/pipeline-adapters";
import type { Pipeline } from "@/types";
import type { ControllerOptions } from "@/types/pipeline-runtime";
import {
  beginControllerRun,
  compilePlan,
  runLoop,
  runUntil,
  startRetryAt,
  stopController,
} from "./debug-controller-runtime";
import {
  buildLayoutMap,
  createInitialState,
  resolveRetryIndex,
  type ControllerState,
} from "./debug-controller-state";

export interface DebugController {
  start(
    pipeline: Pipeline,
    envVars: Record<string, string>,
    options: ControllerOptions,
  ): Promise<{ valid: boolean; errors?: string[] }>;
  step(): Promise<void>;
  resume(): Promise<void>;
  stop(): void;
  retry(): Promise<void>;
}

export function createDebugController(): DebugController {
  const state = createInitialState();

  async function start(
    pipeline: Pipeline,
    envVars: Record<string, string>,
    options: ControllerOptions,
  ): Promise<{ valid: boolean; errors?: string[] }> {
    if (state.status === "running") {
      return { valid: false, errors: ["Pipeline is already running"] };
    }

    const res = await compilePlan(pipeline);
    if (!res?.ok) {
      return { valid: false, errors: [res?.error.message ?? "Unable to compile pipeline"] };
    }

    const blockingWarnings = res.data.warnings.filter((warning) => warning.severity === "error");
    if (blockingWarnings.length > 0) {
      return { valid: false, errors: blockingWarnings.map((warning) => warning.message) };
    }

    const executionPipeline = buildExecutionPipelineFromCompileOutput(pipeline, res.data);
    initializeControllerState(state, executionPipeline, envVars, options, res.data);
    beginControllerRun(state, executionPipeline, envVars, options, state.executionId!);
    return { valid: true };
  }

  async function step(): Promise<void> {
    if (state.status !== "paused" || state.isAdvancing || !state.generator) return;
    state.status = "running";
    usePipelineExecutionStore.getState().setStatus("running");
    await runUntil(
      state,
      (event) =>
        event.type === "step_ready" ||
        event.type === "step_failed" ||
        event.type === "execution_completed" ||
        event.type === "execution_interrupted",
    );
  }

  async function resume(): Promise<void> {
    if (state.status !== "paused" || state.isAdvancing) return;
    state.status = "running";
    state.executionMode = "auto";
    usePipelineExecutionStore.getState().setStatus("running");
    void runLoop(state);
  }

  async function retry(): Promise<void> {
    if (!state.pipeline) return;
    const index = resolveRetryIndex(state);
    if (index === null) return;
    await startRetryAt(state, index);
  }

  return {
    start,
    step,
    resume,
    stop: () => stopController(state),
    retry,
    __state: state,
  } as unknown as DebugController;
}

function initializeControllerState(
  state: ControllerState,
  pipeline: Pipeline,
  envVars: Record<string, string>,
  options: ControllerOptions,
  compiledResult: NonNullable<ControllerState["compiledResult"]>,
) {
  Object.assign(state, {
    pipeline,
    envVars,
    snapshots: [],
    runtimeVariables: options.initialRuntimeVariables ?? {},
    currentStepIndex: 0,
    startedAt: Date.now(),
    executionId: crypto.randomUUID(),
    executionMode: options.executionMode ?? "auto",
    originExecutionMode: options.executionMode ?? "auto",
    masterAbort: new AbortController(),
    abortControls: new Map(),
    status: "running",
    totalSteps: compiledResult.plan.order.length,
    compiledPlan: compiledResult.plan,
    compiledResult,
    layoutByStep: buildLayoutMap(compiledResult.plan),
  } satisfies Partial<ControllerState>);
}
