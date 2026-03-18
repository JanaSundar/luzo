import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Pipeline, PipelineStep } from "@/types";
import type {
  AIReportCache,
  AIReportConfig,
  AIProviderConfig as DebugAIProviderConfig,
  DebugRuntimeState,
  GeneratorYield,
  SignalGroup,
  StepAbortControl,
  StepSnapshot,
} from "@/types/pipeline-debug";
import { extractSignals, getDefaultSelectedSignals } from "../pipeline/context-signals";
import { validatePipelineDag } from "../pipeline/dag-validator";
import { createPipelineGenerator } from "../pipeline/generator-executor";

type AsyncPipelineGenerator = AsyncGenerator<
  GeneratorYield,
  void,
  Record<string, string> | undefined
>;

interface DebugStore {
  runtime: DebugRuntimeState;
  snapshots: StepSnapshot[];
  runtimeVariables: Record<string, unknown>;

  generator: AsyncPipelineGenerator | null;
  // masterAbort and stepAbortControls moved to hidden refs to avoid Immer freezing

  signalGroups: SignalGroup[];
  selectedSignals: string[];
  showSensitive: boolean;

  /** User-entered overrides for unresolved variables when paused in debug mode */
  variableOverrides: Record<string, string>;
  setVariableOverride: (path: string, value: string) => void;
  clearVariableOverrides: () => void;

  reportConfig: AIReportConfig;
  reportCache: AIReportCache | null;
  reportOutput: string | null;
  reportTitle: string | null;
  isReportDirty: boolean;
  isGeneratingReport: boolean;
  isExportingPDF: boolean;
  estimatedTokens: number;

  aiProvider: DebugAIProviderConfig;

  initDebugSession: (
    pipeline: Pipeline,
    envVariables: Record<string, string>
  ) => { valid: boolean; errors?: string[] };
  stepNext: () => Promise<void>;
  continueAll: () => Promise<void>;
  stopExecution: () => void;
  resetSession: () => void;

  updateSnapshot: (snapshot: StepSnapshot) => void;

  refreshSignals: (steps: PipelineStep[]) => void;
  toggleSignal: (path: string) => void;
  toggleAllSignals: (selected: boolean) => void;
  setShowSensitive: (show: boolean) => void;
  setSelectedSignals: (signals: string[]) => void;

  setReportConfig: (partial: Partial<AIReportConfig>) => void;
  setReportOutput: (output: string, reportTitle?: string | null) => void;
  setReportCache: (cache: AIReportCache) => void;
  setGeneratingReport: (generating: boolean) => void;
  setExportingPDF: (exporting: boolean) => void;
  markReportDirty: () => void;
  setEstimatedTokens: (tokens: number) => void;

  setAIProvider: (config: Partial<DebugAIProviderConfig>) => void;
}

const INITIAL_RUNTIME: DebugRuntimeState = {
  status: "idle",
  currentStepIndex: -1,
  totalSteps: 0,
  startedAt: null,
  completedAt: null,
};

const INITIAL_REPORT_CONFIG: AIReportConfig = {
  tone: "technical",
  prompt: "Analyze the API pipeline execution and provide insights based on the selected signals.",
  selectedSignals: [],
  mode: "preview",
};

const INITIAL_AI_PROVIDER: DebugAIProviderConfig = {
  provider: "openrouter",
  model: "meta-llama/llama-3.3-70b-instruct",
  apiKey: "",
};

export const usePipelineDebugStore = create<DebugStore>()(
  immer((set, get) => {
    // Non-serializable refs outside of the serializable state to avoid Immer freezing.
    const abortRefs = {
      masterAbort: null as AbortController | null,
      stepAbortControls: new Map<string, StepAbortControl>(),
    };

    return {
      runtime: { ...INITIAL_RUNTIME },
      snapshots: [],
      runtimeVariables: {},

      generator: null,

      signalGroups: [],
      selectedSignals: [],
      showSensitive: false,
      variableOverrides: {},

      reportConfig: { ...INITIAL_REPORT_CONFIG },
      reportCache: null,
      reportOutput: null,
      reportTitle: null,
      isReportDirty: false,
      isGeneratingReport: false,
      isExportingPDF: false,
      estimatedTokens: 0,

      aiProvider: { ...INITIAL_AI_PROVIDER },

      initDebugSession: (pipeline, envVariables) => {
        const validation = validatePipelineDag(pipeline.steps);
        if (!validation.valid) {
          return {
            valid: false,
            errors: validation.errors.map((e) => e.message),
          };
        }

        // Deep clone to ensure generator works on plain mutable objects, NOT Immer-frozen ones.
        const clonedPipeline = JSON.parse(JSON.stringify(pipeline));
        const clonedEnv = { ...envVariables };

        // Initialize refs
        abortRefs.masterAbort = new AbortController();
        abortRefs.stepAbortControls.clear();

        const gen = createPipelineGenerator(clonedPipeline, clonedEnv, {
          abortControls: abortRefs.stepAbortControls,
          masterAbort: abortRefs.masterAbort,
        });

        set((state) => {
          state.runtime = {
            status: "paused",
            currentStepIndex: 0,
            totalSteps: pipeline.steps.length,
            startedAt: new Date().toISOString(),
            completedAt: null,
          };
          state.snapshots = [];
          state.runtimeVariables = {};
          state.generator = gen as unknown as AsyncPipelineGenerator;
          state.signalGroups = [];
          state.selectedSignals = [];
          state.variableOverrides = {};
          state.reportOutput = null;
          state.reportTitle = null;
          state.reportCache = null;
          state.isReportDirty = false;
        });

        return { valid: true };
      },

      stepNext: async () => {
        const { generator, runtime } = get();
        if (!generator || runtime.status === "completed" || runtime.status === "failed") return;

        if (runtime.status !== "aborted") {
          set((state) => {
            state.runtime.status = "running";
          });
        }

        const variableOverrides = get().variableOverrides ?? {};
        const result = await generator.next(variableOverrides);

        if (result.done) {
          set((state) => {
            if (state.runtime.status !== "aborted") {
              state.runtime.status = "completed";
              state.runtime.completedAt = new Date().toISOString();
            }
          });
          return;
        }

        const yielded = result.value;
        set((state) => {
          if (state.runtime.status === "aborted") return;

          state.snapshots = yielded.allSnapshots as StepSnapshot[];
          if (yielded.snapshot.variables) {
            state.runtimeVariables = { ...yielded.snapshot.variables } as Record<string, unknown>;
          }
        });

        if (yielded.type === "step_ready") {
          const stepOverrides = get().variableOverrides ?? {};
          const stepResult = await generator.next(stepOverrides);

          if (stepResult.done) {
            set((state) => {
              if (state.runtime.status !== "aborted") {
                state.runtime.status = "completed";
                state.runtime.completedAt = new Date().toISOString();
              }
            });
            return;
          }

          const stepYielded = stepResult.value;
          set((state) => {
            if (state.runtime.status === "aborted") return;

            state.snapshots = stepYielded.allSnapshots as StepSnapshot[];
            if (stepYielded.snapshot.variables) {
              state.runtimeVariables = { ...stepYielded.snapshot.variables } as Record<
                string,
                unknown
              >;
            }
            state.runtime.currentStepIndex = state.snapshots.filter(
              (s) => s.status !== "pending" && s.status !== "running"
            ).length;

            if (stepYielded.type === "pipeline_complete") {
              state.runtime.status = "completed";
              state.runtime.completedAt = new Date().toISOString();
            } else if (stepYielded.type === "error") {
              // Snapshot error status might be 'aborted' if the generator caught an AbortError
              if (stepYielded.snapshot.status === "aborted") {
                state.runtime.status = "aborted";
              } else {
                state.runtime.status = "failed";
              }
              state.runtime.completedAt = new Date().toISOString();
            } else {
              state.runtime.status = "paused";
            }
          });
        } else if (yielded.type === "pipeline_complete") {
          set((state) => {
            if (state.runtime.status !== "aborted") {
              state.runtime.status = "completed";
              state.runtime.completedAt = new Date().toISOString();
            }
          });
        } else if (yielded.type === "error") {
          set((state) => {
            if (yielded.snapshot.status === "aborted") {
              state.runtime.status = "aborted";
            } else if (state.runtime.status !== "aborted") {
              state.runtime.status = "failed";
            }
            state.runtime.completedAt = new Date().toISOString();
          });
        }
      },

      continueAll: async () => {
        const { generator, runtime } = get();
        if (!generator || runtime.status === "completed" || runtime.status === "failed") return;

        if (runtime.status !== "aborted") {
          set((state) => {
            state.runtime.status = "running";
          });
        }

        let done = false;

        while (!done) {
          const variableOverrides = get().variableOverrides ?? {};
          const result = await generator.next(variableOverrides);

          if (result.done) {
            done = true;
            set((state) => {
              if (state.runtime.status !== "aborted") {
                state.runtime.status = "completed";
                state.runtime.completedAt = new Date().toISOString();
              }
            });
            break;
          }

          const yielded = result.value;
          set((state) => {
            if (state.runtime.status === "aborted") return;

            state.snapshots = yielded.allSnapshots as StepSnapshot[];
            if (yielded.snapshot.variables) {
              state.runtimeVariables = { ...yielded.snapshot.variables } as Record<string, unknown>;
            }
            state.runtime.currentStepIndex = state.snapshots.filter(
              (s) => s.status !== "pending" && s.status !== "running"
            ).length;
          });

          if (yielded.type === "pipeline_complete") {
            set((state) => {
              if (state.runtime.status !== "aborted") {
                state.runtime.status = "completed";
                state.runtime.completedAt = new Date().toISOString();
              }
            });
            done = true;
          } else if (yielded.type === "error") {
            set((state) => {
              if (yielded.snapshot.status === "aborted") {
                state.runtime.status = "aborted";
              } else if (state.runtime.status !== "aborted") {
                state.runtime.status = "failed";
              }
              state.runtime.completedAt = new Date().toISOString();
            });
            done = true;
          }
        }
      },

      stopExecution: () => {
        abortRefs.masterAbort?.abort();

        for (const [, control] of abortRefs.stepAbortControls) {
          control.controller.abort();
          if (control.timeoutId) clearTimeout(control.timeoutId);
        }

        set((state) => {
          state.runtime.status = "aborted";
          state.runtime.completedAt = new Date().toISOString();
          state.generator = null;
        });
      },

      resetSession: () => {
        abortRefs.masterAbort?.abort();
        for (const [, control] of abortRefs.stepAbortControls) {
          control.controller.abort();
          if (control.timeoutId) clearTimeout(control.timeoutId);
        }
        abortRefs.stepAbortControls.clear();

        set((state) => {
          state.runtime = { ...INITIAL_RUNTIME };
          state.snapshots = [];
          state.runtimeVariables = {};
          state.generator = null;
          state.signalGroups = [];
          state.selectedSignals = [];
          state.variableOverrides = {};
          state.reportOutput = null;
          state.reportTitle = null;
          state.reportCache = null;
          state.isReportDirty = false;
          state.isGeneratingReport = false;
        });
      },

      setVariableOverride: (path, value) =>
        set((state) => {
          if (!state.variableOverrides) state.variableOverrides = {};
          if (value === "") {
            delete state.variableOverrides[path];
          } else {
            state.variableOverrides[path] = value;
          }
        }),

      clearVariableOverrides: () =>
        set((state) => {
          state.variableOverrides = {};
        }),

      updateSnapshot: (snapshot) =>
        set((state) => {
          const idx = state.snapshots.findIndex((s) => s.stepId === snapshot.stepId);
          if (idx >= 0) {
            state.snapshots[idx] = snapshot as StepSnapshot;
          }
        }),

      refreshSignals: (steps) => {
        const { snapshots } = get();
        const groups = extractSignals(snapshots, steps);
        const defaultSelected = getDefaultSelectedSignals(groups);

        set((state) => {
          state.signalGroups = groups as SignalGroup[];
          state.selectedSignals = defaultSelected;
          state.reportConfig.selectedSignals = defaultSelected;
        });
      },

      toggleSignal: (path) =>
        set((state) => {
          const idx = state.selectedSignals.indexOf(path);
          if (idx >= 0) {
            state.selectedSignals.splice(idx, 1);
          } else {
            state.selectedSignals.push(path);
          }
          state.reportConfig.selectedSignals = [...state.selectedSignals];
          state.isReportDirty = true;
        }),

      toggleAllSignals: (selected) =>
        set((state) => {
          if (selected) {
            const allPaths = state.signalGroups.flatMap((g) =>
              g.variables
                .filter((v) => state.showSensitive || v.sensitivity !== "high")
                .map((v) => v.path)
            );
            state.selectedSignals = allPaths;
          } else {
            state.selectedSignals = [];
          }
          state.reportConfig.selectedSignals = [...state.selectedSignals];
          state.isReportDirty = true;
        }),

      setShowSensitive: (show) =>
        set((state) => {
          state.showSensitive = show;
        }),

      setSelectedSignals: (signals) =>
        set((state) => {
          state.selectedSignals = signals;
          state.reportConfig.selectedSignals = signals;
          state.isReportDirty = true;
        }),

      setReportConfig: (partial) =>
        set((state) => {
          Object.assign(state.reportConfig, partial);
          state.isReportDirty = true;
        }),

      setReportOutput: (output, reportTitle) =>
        set((state) => {
          state.reportOutput = output;
          state.reportTitle = reportTitle ?? null;
          state.isReportDirty = false;
        }),

      setReportCache: (cache) =>
        set((state) => {
          state.reportCache = cache as AIReportCache;
        }),

      setGeneratingReport: (generating) =>
        set((state) => {
          state.isGeneratingReport = generating;
        }),

      setExportingPDF: (exporting) =>
        set((state) => {
          state.isExportingPDF = exporting;
        }),

      markReportDirty: () =>
        set((state) => {
          state.isReportDirty = true;
        }),

      setEstimatedTokens: (tokens) =>
        set((state) => {
          state.estimatedTokens = tokens;
        }),

      setAIProvider: (config) =>
        set((state) => {
          Object.assign(state.aiProvider, config);
        }),
    };
  })
);
