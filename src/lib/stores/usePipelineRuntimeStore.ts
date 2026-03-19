import { create } from "zustand";
import { validatePipelineDag } from "@/lib/pipeline/dag-validator";
import {
  buildRuntimeVariablesFromArtifact,
  buildSnapshotsFromArtifact,
} from "@/lib/pipeline/execution-artifacts";
import { createPipelineGenerator } from "@/lib/pipeline/generator-executor";
import {
  advanceGenerator,
  omitRecord,
  syncGeneratorState,
} from "@/lib/stores/pipeline-runtime-helpers";
import type { Pipeline } from "@/types";
import type {
  DebugRuntimeState,
  DebugSessionOptions,
  GeneratorYield,
  PersistedExecutionArtifact,
  StepAbortControl,
  StepSnapshot,
} from "@/types/pipeline-debug";

type AsyncPipelineGenerator = AsyncGenerator<
  GeneratorYield,
  void,
  Record<string, string> | undefined
>;

interface PipelineRuntimeState {
  runtime: DebugRuntimeState;
  snapshots: StepSnapshot[];
  runtimeVariables: Record<string, unknown>;
  variableOverrides: Record<string, string>;
  generator: AsyncPipelineGenerator | null;
  sessionSource: "live" | "artifact" | null;
  initDebugSession: (
    pipeline: Pipeline,
    envVariables: Record<string, string>,
    options?: DebugSessionOptions
  ) => { valid: boolean; errors?: string[] };
  hydrateFromArtifact: (artifact: PersistedExecutionArtifact | null) => void;
  stepNext: () => Promise<void>;
  continueAll: () => Promise<void>;
  stopExecution: () => void;
  resetSession: () => void;
  setVariableOverride: (path: string, value: string) => void;
  clearVariableOverrides: () => void;
}

const INITIAL_RUNTIME: DebugRuntimeState = {
  status: "idle",
  currentStepIndex: -1,
  totalSteps: 0,
  startedAt: null,
  completedAt: null,
  mode: "full",
  startStepId: null,
  reusedAliases: [],
  staleContextWarning: null,
};

export type { PipelineRuntimeState };

export const usePipelineRuntimeStore = create<PipelineRuntimeState>()((set, get) => {
  const abortRefs = {
    masterAbort: null as AbortController | null,
    stepAbortControls: new Map<string, StepAbortControl>(),
  };

  return {
    runtime: { ...INITIAL_RUNTIME },
    snapshots: [],
    runtimeVariables: {},
    variableOverrides: {},
    generator: null,
    sessionSource: null,

    initDebugSession: (pipeline, envVariables, options = {}) => {
      const validation = validatePipelineDag(pipeline.steps);
      if (!validation.valid) {
        return { valid: false, errors: validation.errors.map((error) => error.message) };
      }

      const startIndex = options.startStepId
        ? pipeline.steps.findIndex((step) => step.id === options.startStepId)
        : 0;
      const totalSteps =
        startIndex >= 0 ? pipeline.steps.length - startIndex : pipeline.steps.length;

      const clonedPipeline = JSON.parse(JSON.stringify(pipeline));
      abortRefs.masterAbort = new AbortController();
      abortRefs.stepAbortControls.clear();

      const generator = createPipelineGenerator(
        clonedPipeline,
        { ...envVariables },
        {
          abortControls: abortRefs.stepAbortControls,
          masterAbort: abortRefs.masterAbort,
          ...options,
        }
      );

      set({
        runtime: {
          status: "paused",
          currentStepIndex: 0,
          totalSteps,
          startedAt: new Date().toISOString(),
          completedAt: null,
          mode: options.executionMode ?? "full",
          startStepId: options.startStepId ?? null,
          reusedAliases: options.reusedAliases ?? [],
          staleContextWarning: options.staleContextWarning ?? null,
        },
        snapshots: [],
        runtimeVariables: options.initialRuntimeVariables ?? {},
        variableOverrides: {},
        generator: generator as AsyncPipelineGenerator,
        sessionSource: "live",
      });

      return { valid: true };
    },

    hydrateFromArtifact: (artifact) =>
      set({
        runtime: artifact
          ? {
              ...INITIAL_RUNTIME,
              status: "completed",
              totalSteps: artifact.steps.length,
              startedAt: artifact.generatedAt,
              completedAt: artifact.runtime.completedAt,
              mode: artifact.runtime.mode,
              startStepId: artifact.runtime.startStepId,
              reusedAliases: artifact.runtime.reusedAliases,
              staleContextWarning: artifact.runtime.staleContextWarning,
            }
          : { ...INITIAL_RUNTIME },
        snapshots: artifact ? buildSnapshotsFromArtifact(artifact) : [],
        runtimeVariables: artifact ? buildRuntimeVariablesFromArtifact(artifact) : {},
        variableOverrides: {},
        generator: null,
        sessionSource: artifact ? "artifact" : null,
      }),

    stepNext: async () => {
      const { generator } = get();
      if (!generator) return;
      set((state) => ({ runtime: { ...state.runtime, status: "running" } }));
      const next = await advanceGenerator(generator, get().variableOverrides);
      syncGeneratorState(next, set);
    },

    continueAll: async () => {
      const { generator } = get();
      if (!generator) return;
      set((state) => ({ runtime: { ...state.runtime, status: "running" } }));
      let next = await advanceGenerator(generator, get().variableOverrides);
      while (!next.done) {
        syncGeneratorState(next, set);
        if (get().runtime.status === "failed" || get().runtime.status === "aborted") return;
        if (get().runtime.status === "completed") return;
        set((state) => ({ runtime: { ...state.runtime, status: "running" } }));
        next = await advanceGenerator(generator, get().variableOverrides);
      }
      syncGeneratorState(next, set);
    },

    stopExecution: () => {
      abortRefs.masterAbort?.abort();
      for (const control of abortRefs.stepAbortControls.values()) {
        control.controller.abort();
        if (control.timeoutId) clearTimeout(control.timeoutId);
      }
      set((state) => ({
        runtime: { ...state.runtime, status: "aborted", completedAt: new Date().toISOString() },
        generator: null,
      }));
    },

    resetSession: () => {
      abortRefs.masterAbort?.abort();
      for (const control of abortRefs.stepAbortControls.values()) {
        control.controller.abort();
        if (control.timeoutId) clearTimeout(control.timeoutId);
      }
      abortRefs.stepAbortControls.clear();
      set({
        runtime: { ...INITIAL_RUNTIME },
        snapshots: [],
        runtimeVariables: {},
        variableOverrides: {},
        generator: null,
        sessionSource: null,
      });
    },

    setVariableOverride: (path, value) =>
      set((state) => ({
        variableOverrides: value
          ? { ...state.variableOverrides, [path]: value }
          : omitRecord(state.variableOverrides, path),
      })),

    clearVariableOverrides: () => set({ variableOverrides: {} }),
  };
});
