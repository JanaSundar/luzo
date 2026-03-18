import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  NarrativeTone,
  Pipeline,
  PipelineExecutionResult,
  PipelineStep,
  PipelineView,
} from "@/types";

export interface AIProviderConfig {
  providerUrl: string;
  apiKey: string;
  model: string;
}

interface PipelineState {
  pipelines: Pipeline[];
  activePipelineId: string | null;
  currentView: PipelineView;
  executionResult: PipelineExecutionResult | null;
  isExecuting: boolean;
  aiProvider: AIProviderConfig;
  selectedStepId: string | null;
  preferences: {
    skipDeleteConfirmation: boolean;
  };

  // Actions
  setPipelines: (pipelines: Pipeline[]) => void;
  setActivePipeline: (id: string | null) => void;
  setView: (view: PipelineView) => void;
  setExecutionResult: (result: PipelineExecutionResult | null) => void;
  setExecuting: (isExecuting: boolean) => void;
  setAIProvider: (config: Partial<AIProviderConfig>) => void;
  setSelectedStepId: (id: string | null) => void;
  setPreferences: (partial: Partial<{ skipDeleteConfirmation: boolean }>) => void;

  // Pipeline Management
  addPipeline: (name: string) => void;
  updatePipeline: (id: string, partial: Partial<Pipeline>) => void;
  deletePipeline: (id: string) => void;
  deletePipelines: (ids: string[]) => void;
  duplicatePipeline: (id: string) => void;

  // Step Management
  addStep: (pipelineId: string, step: Omit<PipelineStep, "id">) => void;
  updateStep: (pipelineId: string, stepId: string, partial: Partial<PipelineStep>) => void;
  removeStep: (pipelineId: string, stepId: string) => void;
  reorderSteps: (pipelineId: string, stepIds: string[]) => void;
  duplicateStep: (pipelineId: string, stepId: string) => void;
}

const DEFAULT_NARRATIVE_CONFIG = {
  tone: "technical" as NarrativeTone,
  prompt: "Analyze the following API response...",
  enabled: true,
};

const DEFAULT_AI_PROVIDER: AIProviderConfig = {
  providerUrl: "https://openrouter.ai/api/v1/chat/completions",
  apiKey: "",
  model: "meta-llama/llama-3.1-8b-instruct:free",
};

export const usePipelineStore = create<PipelineState>()(
  persist(
    immer((set, _get) => ({
      pipelines: [],
      activePipelineId: null,
      currentView: "builder",
      executionResult: null,
      isExecuting: false,
      aiProvider: { ...DEFAULT_AI_PROVIDER },
      selectedStepId: null,
      preferences: {
        skipDeleteConfirmation: false,
      },

      setPipelines: (pipelines) => set({ pipelines }),
      setActivePipeline: (activePipelineId) => set({ activePipelineId }),
      setView: (currentView) => set({ currentView }),
      setExecutionResult: (executionResult) => set({ executionResult }),
      setExecuting: (isExecuting) => set({ isExecuting }),
      setAIProvider: (config) =>
        set((state) => {
          Object.assign(state.aiProvider, config);
        }),
      setSelectedStepId: (selectedStepId) => set({ selectedStepId }),
      setPreferences: (prefs) =>
        set((state) => {
          Object.assign(state.preferences, prefs);
        }),

      addPipeline: (name) =>
        set((state) => {
          const newPipeline: Pipeline = {
            id: crypto.randomUUID(),
            name: name || `New Pipeline ${state.pipelines.length + 1}`,
            steps: [],
            narrativeConfig: { ...DEFAULT_NARRATIVE_CONFIG },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          state.pipelines.push(newPipeline);
          state.activePipelineId = newPipeline.id;
        }),

      updatePipeline: (id, partial) =>
        set((state) => {
          const pipeline = state.pipelines.find((p) => p.id === id);
          if (pipeline) {
            Object.assign(pipeline, partial);
            pipeline.updatedAt = new Date().toISOString();
          }
        }),

      deletePipeline: (id) =>
        set((state) => {
          state.pipelines = state.pipelines.filter((p) => p.id !== id);
          if (state.activePipelineId === id) {
            state.activePipelineId = state.pipelines[0]?.id ?? null;
          }
        }),

      deletePipelines: (ids) =>
        set((state) => {
          state.pipelines = state.pipelines.filter((p) => !ids.includes(p.id));
          if (state.activePipelineId && ids.includes(state.activePipelineId)) {
            state.activePipelineId = state.pipelines[0]?.id ?? null;
          }
        }),

      duplicatePipeline: (id) =>
        set((state) => {
          const original = state.pipelines.find((p) => p.id === id);
          if (original) {
            const copy: Pipeline = {
              ...original,
              id: crypto.randomUUID(),
              name: `${original.name} (Copy)`,
              steps: original.steps.map((s) => ({
                ...s,
                id: crypto.randomUUID(),
              })),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            state.pipelines.push(copy);
            state.activePipelineId = copy.id;
          }
        }),

      addStep: (pipelineId, step) =>
        set((state) => {
          const pipeline = state.pipelines.find((p) => p.id === pipelineId);
          if (pipeline) {
            pipeline.steps.push({
              ...step,
              id: crypto.randomUUID(),
            } as PipelineStep);
            pipeline.updatedAt = new Date().toISOString();
          }
        }),

      updateStep: (pipelineId, stepId, partial) =>
        set((state) => {
          const pipeline = state.pipelines.find((p) => p.id === pipelineId);
          if (pipeline) {
            const step = pipeline.steps.find((s) => s.id === stepId);
            if (step) {
              Object.assign(step, partial);
              pipeline.updatedAt = new Date().toISOString();
            }
          }
        }),

      removeStep: (pipelineId, stepId) =>
        set((state) => {
          const pipeline = state.pipelines.find((p) => p.id === pipelineId);
          if (pipeline) {
            pipeline.steps = pipeline.steps.filter((s) => s.id !== stepId);
            pipeline.updatedAt = new Date().toISOString();
          }
        }),

      reorderSteps: (pipelineId, stepIds) =>
        set((state) => {
          const pipeline = state.pipelines.find((p) => p.id === pipelineId);
          if (pipeline) {
            pipeline.steps = stepIds
              .map((id) => pipeline.steps.find((s) => s.id === id))
              .filter((s): s is PipelineStep => !!s);
            pipeline.updatedAt = new Date().toISOString();
          }
        }),

      duplicateStep: (pipelineId, stepId) =>
        set((state) => {
          const pipeline = state.pipelines.find((p) => p.id === pipelineId);
          if (pipeline) {
            const stepIndex = pipeline.steps.findIndex((s) => s.id === stepId);
            if (stepIndex !== -1) {
              const original = pipeline.steps[stepIndex];
              const copy: PipelineStep = {
                ...original,
                id: crypto.randomUUID(),
                name: `${original.name} (Copy)`,
              };
              pipeline.steps.splice(stepIndex + 1, 0, copy);
              pipeline.updatedAt = new Date().toISOString();
            }
          }
        }),
    })),
    {
      name: "pipeline-store",
      partialize: (s) => ({
        pipelines: s.pipelines,
        activePipelineId: s.activePipelineId,
        currentView: s.currentView,
        aiProvider: {
          ...s.aiProvider,
          apiKey: "", // never persist API key
        },
        preferences: s.preferences,
      }),
    }
  )
);
