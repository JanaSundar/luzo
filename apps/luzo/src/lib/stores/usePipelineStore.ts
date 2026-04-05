import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { FlowDocument } from "@/features/flow-editor/domain/types";
import {
  addRequestStepToPipeline,
  duplicateRequestStepInPipeline,
  removeRequestStepFromPipeline,
  reorderRequestStepsInPipeline,
  syncPipelineGraph,
  updateRequestStepInPipeline,
} from "@/features/flow-editor/domain/pipeline-sync";
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
  setFlowDocument: (pipelineId: string, flow: FlowDocument) => void;
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
          syncPipelineGraph(pipeline);
          state.pipelines.push(pipeline);
          state.activePipelineId = pipeline.id;
        }),

      mergeMissingPipelines: (pipelines) =>
        set((state) => {
          const existingIds = new Set(state.pipelines.map((entry) => entry.id));
          const missing = pipelines.filter((pipeline) => !existingIds.has(pipeline.id));
          if (missing.length === 0) return;

          missing.forEach((pipeline) => syncPipelineGraph(pipeline));
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
          syncPipelineGraph(pipeline);
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
            flow: JSON.parse(JSON.stringify(original.flow)) as FlowDocument,
            name: `${original.name} (Copy)`,
            steps: original.steps.map((step) => ({ ...step, id: crypto.randomUUID() })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          syncPipelineGraph(copy);
          state.pipelines.push(copy);
          state.activePipelineId = copy.id;
        }),

      setFlowDocument: (pipelineId, flow) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          pipeline.flow = flow;
          syncPipelineGraph(pipeline);
        }),

      addStep: (pipelineId, step) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          addRequestStepToPipeline(pipeline, step);
        }),

      updateStep: (pipelineId, stepId, partial) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          updateRequestStepInPipeline(pipeline, stepId, partial);
        }),

      removeStep: (pipelineId, stepId) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          removeRequestStepFromPipeline(pipeline, stepId);
        }),

      reorderSteps: (pipelineId, stepIds) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          reorderRequestStepsInPipeline(pipeline, stepIds);
        }),

      duplicateStep: (pipelineId, stepId) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          duplicateRequestStepInPipeline(pipeline, stepId);
        }),

      setExecuting: (executing) => set({ executing }),
      setExecutionResult: (executionResult) => set({ executionResult }),
    })),
    {
      name: "luzo-collections-store",
      storage: createJSONStorage(() => createIndexedDbStorage({ dbName: "luzo-collections" })),
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<PipelineState>;
        const pipelines = (state.pipelines ?? []).map((pipeline) => {
          const next = { ...(pipeline as Pipeline) };
          syncPipelineGraph(next);
          return next;
        });

        return {
          ...INITIAL_STATE,
          ...state,
          pipelines,
        };
      },
      partialize: (state) => ({
        pipelines: state.pipelines,
        activePipelineId: state.activePipelineId,
      }),
    },
  ),
);
