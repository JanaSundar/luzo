"use client";

import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { useTimelineStore } from "@/stores/useTimelineStore";
import type { Pipeline } from "@/types";
import type {
  ControllerOptions,
  DebugStatus,
  PipelineExecutionEvent,
} from "@/types/pipeline-runtime";
import type { CompilePlanOutput, Result } from "@/types/worker-results";
import { analysisWorkerClient } from "@/workers/client/analysis-client";
import { graphWorkerClient } from "@/workers/client/graph-client";
import { buildWorkflowBundleFromPipeline } from "@/features/workflow/pipeline-adapters";
import { createPipelineGenerator } from "./generator-executor";
import { applyEvent, type ControllerState, resetAbortControls } from "./debug-controller-state";

export type PausePredicate = (event: PipelineExecutionEvent) => boolean;

export async function runUntil(state: ControllerState, shouldPause: PausePredicate): Promise<void> {
  if (state.isAdvancing) return;
  state.isAdvancing = true;

  try {
    while (state.generator && !state.masterAbort.signal.aborted) {
      const overrides = usePipelineExecutionStore.getState().variableOverrides;
      const result = await state.generator.next(overrides);
      usePipelineExecutionStore.getState().clearVariableOverrides();

      if (result.done) break;
      applyEvent(state, result.value);
      if (shouldPause(result.value)) break;
    }
  } catch (err) {
    if (!state.masterAbort.signal.aborted) {
      state.status = "error";
      usePipelineExecutionStore.getState().setError(String(err));
    }
  } finally {
    state.isAdvancing = false;
  }
}

export function runLoop(state: ControllerState): Promise<void> {
  return runUntil(state, (event) => state.executionMode === "debug" && event.type === "step_ready");
}

export async function compilePlan(pipeline: Pipeline) {
  const bundle = buildWorkflowBundleFromPipeline(pipeline);
  return graphWorkerClient.callLatest<Result<CompilePlanOutput>>("debug-plan", async (api) =>
    api.compileExecutionPlan({
      workflow: bundle.workflow,
      registry: bundle.registry,
    }),
  );
}

export async function startRetryAt(state: ControllerState, index: number): Promise<void> {
  if (!state.pipeline || state.isAdvancing) return;

  resetAbortControls(state);

  const api = await analysisWorkerClient.get();
  const result = (await api.rebuildRuntimeVariables({
    pipeline: state.pipeline,
    snapshots: state.snapshots,
    upToIndex: index,
  })) as Result<Record<string, unknown>>;

  const runtimeVariables = result?.ok ? result.data : {};
  const startStepId = state.pipeline.steps[index]?.id;

  state.snapshots = state.snapshots.slice(0, index);
  state.currentStepIndex = index;
  state.runtimeVariables = runtimeVariables;
  state.status = "running";
  state.executionMode = state.originExecutionMode;
  state.masterAbort = new AbortController();

  usePipelineExecutionStore.setState((store) => ({
    ...store,
    snapshots: state.snapshots,
    runtimeVariables,
    originExecutionMode: state.originExecutionMode,
    currentStepIndex: index,
    errorMessage: null,
    status: "running",
  }));
  useTimelineStore.getState().reset();

  state.generator = createPipelineGenerator(state.pipeline, state.envVars, {
    executionId: state.executionId ?? crypto.randomUUID(),
    abortControls: state.abortControls,
    masterAbort: state.masterAbort,
    compiledPlan: state.compiledPlan ?? undefined,
    compiledResult: state.compiledResult ?? undefined,
    startStepId,
    initialRuntimeVariables: runtimeVariables,
    useStream: state.originExecutionMode === "debug",
  });

  void runLoop(state);
}

export function beginControllerRun(
  state: ControllerState,
  pipeline: Pipeline,
  envVars: Record<string, string>,
  options: ControllerOptions,
  executionId: string,
) {
  state.generator = createPipelineGenerator(pipeline, envVars, {
    executionId,
    abortControls: state.abortControls,
    masterAbort: state.masterAbort,
    compiledPlan: state.compiledPlan ?? undefined,
    compiledResult: state.compiledResult ?? undefined,
    startStepId: options.startStepId,
    initialRuntimeVariables: options.initialRuntimeVariables,
    stepTimeoutMs: options.stepTimeoutMs,
    useStream: state.executionMode === "debug",
  });

  useTimelineStore.getState().reset();
  usePipelineExecutionStore.getState().reset();
  usePipelineExecutionStore.getState().setOriginExecutionMode(state.originExecutionMode);
  usePipelineExecutionStore.getState().setExecutionMeta({
    executionId,
    totalSteps: state.totalSteps,
    startedAt: state.startedAt ?? Date.now(),
  });
  usePipelineExecutionStore.getState().setStatus("running");

  void runLoop(state);
}

export function stopController(state: ControllerState): void {
  const terminalStatuses: DebugStatus[] = ["completed", "aborted", "interrupted"];
  if (terminalStatuses.includes(state.status)) return;

  state.masterAbort.abort();
  state.generator = null;
  state.status = "interrupted";
  usePipelineExecutionStore.getState().setStatus("interrupted");
}
