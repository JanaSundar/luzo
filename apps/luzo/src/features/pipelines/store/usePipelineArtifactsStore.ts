import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CheckpointArtifact } from "@/features/pipeline/pipeline-persistence";
import { createIndexedDbStorage } from "@/services/storage/zustand-indexeddb";
import type {
  AIReportCache,
  PersistedDebuggerArtifact,
  PersistedExecutionArtifact,
  PersistedPipelineArtifacts,
} from "@/types/pipeline-debug";

interface PipelineArtifactsState {
  executionByPipelineId: Record<string, PersistedExecutionArtifact>;
  reportsByPipelineId: Record<string, AIReportCache>;
  debuggerByPipelineId: Record<string, PersistedDebuggerArtifact>;
  saveExecutionArtifact: (
    pipelineId: string,
    artifact: PersistedExecutionArtifact | CheckpointArtifact,
  ) => void;
  saveReportArtifact: (pipelineId: string, report: AIReportCache) => void;
  saveDebuggerArtifact: (pipelineId: string, debuggerArtifact: PersistedDebuggerArtifact) => void;
  deleteReportArtifact: (pipelineId: string) => void;
  deleteArtifacts: (pipelineId: string) => void;
  deleteArtifactsBatch: (pipelineIds: string[]) => void;
  getExecutionArtifact: (
    pipelineId: string | null,
  ) => (PersistedExecutionArtifact | CheckpointArtifact) | null;
  getReportArtifact: (pipelineId: string | null) => AIReportCache | null;
}

const INITIAL_STATE: PersistedPipelineArtifacts = {
  executionByPipelineId: {},
  reportsByPipelineId: {},
  debuggerByPipelineId: {},
};

export const usePipelineArtifactsStore = create<PipelineArtifactsState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      saveExecutionArtifact: (pipelineId, artifact) =>
        set((state) => ({
          executionByPipelineId: {
            ...state.executionByPipelineId,
            [pipelineId]: artifact as PersistedExecutionArtifact,
          },
        })),

      saveReportArtifact: (pipelineId, report) =>
        set((state) => ({
          reportsByPipelineId: { ...state.reportsByPipelineId, [pipelineId]: report },
        })),

      saveDebuggerArtifact: (pipelineId, debuggerArtifact) =>
        set((state) => ({
          debuggerByPipelineId: { ...state.debuggerByPipelineId, [pipelineId]: debuggerArtifact },
        })),

      deleteReportArtifact: (pipelineId) =>
        set((state) => ({
          reportsByPipelineId: omit(state.reportsByPipelineId, pipelineId),
        })),

      deleteArtifacts: (pipelineId) =>
        set((state) => ({
          executionByPipelineId: omit(state.executionByPipelineId, pipelineId),
          reportsByPipelineId: omit(state.reportsByPipelineId, pipelineId),
          debuggerByPipelineId: omit(state.debuggerByPipelineId, pipelineId),
        })),

      deleteArtifactsBatch: (pipelineIds) =>
        set((state) => ({
          executionByPipelineId: omitMany(state.executionByPipelineId, pipelineIds),
          reportsByPipelineId: omitMany(state.reportsByPipelineId, pipelineIds),
          debuggerByPipelineId: omitMany(state.debuggerByPipelineId, pipelineIds),
        })),

      getExecutionArtifact: (pipelineId) =>
        pipelineId ? (get().executionByPipelineId[pipelineId] ?? null) : null,

      getReportArtifact: (pipelineId) =>
        pipelineId ? (get().reportsByPipelineId[pipelineId] ?? null) : null,
    }),
    {
      name: "pipeline-artifacts-store",
      storage: createJSONStorage(() => createIndexedDbStorage({ dbName: "luzo-state" })),
      partialize: (state) => ({
        executionByPipelineId: state.executionByPipelineId,
        reportsByPipelineId: state.reportsByPipelineId,
        debuggerByPipelineId: state.debuggerByPipelineId,
      }),
    },
  ),
);

function omit<T>(record: Record<string, T>, key: string) {
  const next = { ...record };
  delete next[key];
  return next;
}

function omitMany<T>(record: Record<string, T>, keys: string[]) {
  return keys.reduce((next, key) => omit(next, key), record);
}
