import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { deriveAiSafeResponse } from "@/server/http/response-utils";
import { createIndexedDbStorage } from "@/services/storage/zustand-indexeddb";
import type { ApiResponse } from "@/types";
import type { DebugRuntimeState, StepSnapshot } from "@/types/pipeline-debug";

interface ExecutionResult {
  stepId: string;
  rawResponse: ApiResponse | null;
  aiSafeResponse: Partial<ApiResponse> | null;
  status: "idle" | "running" | "completed" | "error" | "aborted";
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

interface ExecutionState {
  // Playground Execution
  activeRawResponse: ApiResponse | null;
  activeAiSafeResponse: Partial<ApiResponse> | null;
  isLoading: boolean;

  // Pipeline Execution
  results: Record<string, ExecutionResult>;
  runtime: DebugRuntimeState | null;
  snapshots: StepSnapshot[];

  // Actions
  setPlaygroundResponse: (response: ApiResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setStepResult: (stepId: string, result: Partial<ExecutionResult>) => void;
  setRuntime: (runtime: DebugRuntimeState | null) => void;
  setSnapshots: (snapshots: StepSnapshot[]) => void;
  clearResults: () => void;
}

export const useExecutionStore = create<ExecutionState>()(
  persist(
    immer((set) => ({
      activeRawResponse: null,
      activeAiSafeResponse: null,
      isLoading: false,
      results: {},
      runtime: null,
      snapshots: [],

      setPlaygroundResponse: (response) =>
        set((state) => {
          state.activeRawResponse = response;
          state.activeAiSafeResponse = response ? deriveAiSafeResponse(response) : null;
        }),

      setLoading: (isLoading) =>
        set((state) => {
          state.isLoading = isLoading;
        }),

      setStepResult: (stepId, result) =>
        set((state) => {
          const existing = state.results[stepId] || {
            stepId,
            rawResponse: null,
            aiSafeResponse: null,
            status: "idle",
          };

          if (result.rawResponse) {
            result.aiSafeResponse = deriveAiSafeResponse(result.rawResponse);
          }

          state.results[stepId] = { ...existing, ...result };
        }),

      setRuntime: (runtime) =>
        set((state) => {
          state.runtime = runtime;
        }),

      setSnapshots: (snapshots) =>
        set((state) => {
          state.snapshots = snapshots;
        }),

      clearResults: () =>
        set((state) => {
          state.results = {};
          state.runtime = null;
          state.snapshots = [];
        }),
    })),
    {
      name: "luzo-execution-store",
      storage: createJSONStorage(() => createIndexedDbStorage({ dbName: "luzo-execution" })),
    },
  ),
);
