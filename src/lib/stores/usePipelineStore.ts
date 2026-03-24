import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { createPipelineRecord } from "@/lib/pipeline/createPipelineRecord";
import { createIndexedDbStorage } from "@/lib/storage/zustand-indexeddb";
import type { Pipeline, PipelineExecutionResult, PipelineStep, PipelineView } from "@/types";

interface PipelineState {
  pipelines: Pipeline[];
  activePipelineId: string | null;
  currentView: PipelineView;
  expandedStepIds: Record<string, string | null>;

  setActivePipeline: (id: string | null) => void;
  setView: (view: PipelineView) => void;
  setExpandedStepId: (pipelineId: string, stepId: string | null) => void;
  getExpandedStepId: (pipelineId: string) => string | null;
  addPipeline: (name: string) => void;
  insertPipeline: (pipeline: Pipeline) => void;
  mergeMissingPipelines: (pipelines: Pipeline[]) => void;
  updatePipeline: (id: string, partial: Partial<Pipeline>) => void;
  deletePipeline: (id: string) => void;
  deletePipelines: (ids: string[]) => void;
  duplicatePipeline: (id: string) => void;
  addStep: (pipelineId: string, step: Omit<PipelineStep, "id">) => void;
  updateStep: (pipelineId: string, stepId: string, partial: Partial<PipelineStep>) => void;
  removeStep: (pipelineId: string, stepId: string) => void;
  reorderSteps: (pipelineId: string, stepIds: string[]) => void;
  duplicateStep: (pipelineId: string, stepId: string) => void;
  // Execution State
  executing: boolean;
  executionResult: PipelineExecutionResult | null;
  setExecuting: (executing: boolean) => void;
  setExecutionResult: (result: PipelineExecutionResult | null) => void;
}

const INITIAL_STATE = {
  pipelines: [],
  activePipelineId: null,
  currentView: "builder" as PipelineView,
  expandedStepIds: {} as Record<string, string | null>,
  executing: false,
  executionResult: null as PipelineExecutionResult | null,
};

export const usePipelineStore = create<PipelineState>()(
  persist(
    immer((set, get) => ({
      ...INITIAL_STATE,

      setActivePipeline: (activePipelineId) => set({ activePipelineId }),
      setView: (currentView) => set({ currentView }),
      setExpandedStepId: (pipelineId, stepId) =>
        set((state) => {
          state.expandedStepIds[pipelineId] = stepId;
        }),
      getExpandedStepId: (pipelineId) => get().expandedStepIds[pipelineId] ?? null,

      addPipeline: (name) =>
        set((state) => {
          const pipeline = createPipelineRecord(
            name || `New Pipeline ${state.pipelines.length + 1}`,
          );
          state.pipelines.push(pipeline);
          state.activePipelineId = pipeline.id;
        }),

      insertPipeline: (pipeline) =>
        set((state) => {
          state.pipelines.push(pipeline);
          state.activePipelineId = pipeline.id;
        }),

      mergeMissingPipelines: (pipelines) =>
        set((state) => {
          const existingIds = new Set(state.pipelines.map((entry) => entry.id));
          const missing = pipelines.filter((pipeline) => !existingIds.has(pipeline.id));
          if (missing.length === 0) return;

          state.pipelines.push(...missing);
          if (!state.activePipelineId) {
            state.activePipelineId = missing[0]?.id ?? state.pipelines[0]?.id ?? null;
          }
        }),

      updatePipeline: (id, partial) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === id);
          if (!pipeline) return;
          Object.assign(pipeline, partial);
          pipeline.updatedAt = new Date().toISOString();
        }),

      deletePipeline: (id) => {
        set((state) => {
          state.pipelines = state.pipelines.filter((entry) => entry.id !== id);
          if (state.activePipelineId === id) {
            state.activePipelineId = state.pipelines[0]?.id ?? null;
          }
        });
      },

      deletePipelines: (ids) => {
        set((state) => {
          state.pipelines = state.pipelines.filter((entry) => !ids.includes(entry.id));
          if (state.activePipelineId && ids.includes(state.activePipelineId)) {
            state.activePipelineId = state.pipelines[0]?.id ?? null;
          }
        });
      },

      duplicatePipeline: (id) =>
        set((state) => {
          const original = state.pipelines.find((entry) => entry.id === id);
          if (!original) return;
          const copy: Pipeline = {
            ...original,
            id: crypto.randomUUID(),
            name: `${original.name} (Copy)`,
            steps: original.steps.map((step) => ({ ...step, id: crypto.randomUUID() })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          state.pipelines.push(copy);
          state.activePipelineId = copy.id;
        }),

      addStep: (pipelineId, step) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          pipeline.steps.push({ ...step, id: crypto.randomUUID() } as PipelineStep);
          pipeline.updatedAt = new Date().toISOString();
        }),

      updateStep: (pipelineId, stepId, partial) =>
        set((state) => {
          const step = findPipelineStep(state.pipelines, pipelineId, stepId);
          if (!step) return;
          Object.assign(step.step, partial);
          step.pipeline.updatedAt = new Date().toISOString();
        }),

      removeStep: (pipelineId, stepId) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          pipeline.steps = pipeline.steps.filter((step) => step.id !== stepId);
          pipeline.updatedAt = new Date().toISOString();
        }),

      reorderSteps: (pipelineId, stepIds) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          pipeline.steps = stepIds
            .map((stepId) => pipeline.steps.find((step) => step.id === stepId))
            .filter((step): step is PipelineStep => Boolean(step));
          pipeline.updatedAt = new Date().toISOString();
        }),

      duplicateStep: (pipelineId, stepId) =>
        set((state) => {
          const step = findPipelineStep(state.pipelines, pipelineId, stepId);
          if (!step) return;
          const stepCopy: PipelineStep = {
            ...step.step,
            id: crypto.randomUUID(),
            name: `${step.step.name} (Copy)`,
          };
          step.pipeline.steps.splice(step.index + 1, 0, stepCopy);
          step.pipeline.updatedAt = new Date().toISOString();
        }),

      setExecuting: (executing) => set({ executing }),
      setExecutionResult: (executionResult) => set({ executionResult }),
    })),
    {
      name: "luzo-collections-store",
      storage: createJSONStorage(() => createIndexedDbStorage({ dbName: "luzo-collections" })),
      partialize: (state) => ({
        pipelines: state.pipelines,
        activePipelineId: state.activePipelineId,
      }),
    },
  ),
);

function findPipelineStep(pipelines: Pipeline[], pipelineId: string, stepId: string) {
  const pipeline = pipelines.find((entry) => entry.id === pipelineId);
  if (!pipeline) return null;
  const index = pipeline.steps.findIndex((step) => step.id === stepId);
  if (index === -1) return null;
  return { pipeline, step: pipeline.steps[index], index };
}
