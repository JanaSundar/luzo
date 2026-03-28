import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ControllerSnapshot, StepSnapshot } from "@/types/pipeline-runtime";

interface ExecutionState {
  executionId: string | null;
  status: "idle" | "running" | "paused" | "error" | "completed" | "aborted" | "interrupted";
  currentStepIndex: number;
  totalSteps: number;
  snapshots: StepSnapshot[];
  runtimeVariables: Record<string, unknown>;
  variableOverrides: Record<string, string>;
  errorMessage: string | null;
  startedAt: number | null;
  completedAt: number | null;
  hasPersistedExecution: boolean;

  // Actions
  reset: () => void;
  setStatus: (status: ExecutionState["status"]) => void;
  setSnapshots: (snapshots: StepSnapshot[]) => void;
  appendSnapshot: (snapshot: StepSnapshot) => void;
  updateSnapshot: (index: number, snapshot: Partial<StepSnapshot>) => void;
  setCurrentStepIndex: (index: number) => void;
  setRuntimeVariables: (vars: Record<string, unknown>) => void;
  setVariableOverride: (path: string, value: string) => void;
  clearVariableOverrides: () => void;
  setError: (error: string | null) => void;
  setExecutionMeta: (meta: { executionId: string; totalSteps: number; startedAt: number }) => void;
  setHasPersistedExecution: (has: boolean) => void;
  applyControllerSnapshot: (snap: ControllerSnapshot) => void;
}

const INITIAL_STATE = {
  executionId: null,
  status: "idle" as const,
  currentStepIndex: -1,
  totalSteps: 0,
  snapshots: [],
  runtimeVariables: {},
  variableOverrides: {},
  errorMessage: null,
  startedAt: null,
  completedAt: null,
  hasPersistedExecution: false,
};

export const usePipelineExecutionStore = create<ExecutionState>()(
  immer((set) => ({
    ...INITIAL_STATE,

    reset: () =>
      set((state) => {
        Object.assign(state, INITIAL_STATE);
      }),

    setStatus: (status) =>
      set((state) => {
        state.status = status;
      }),

    setSnapshots: (snapshots) =>
      set((state) => {
        state.snapshots = snapshots;
      }),

    appendSnapshot: (snapshot) =>
      set((state) => {
        state.snapshots.push(snapshot);
      }),

    updateSnapshot: (index, snapshot) =>
      set((state) => {
        if (state.snapshots[index]) {
          state.snapshots[index] = { ...state.snapshots[index], ...snapshot };
        }
      }),

    setCurrentStepIndex: (index) =>
      set((state) => {
        state.currentStepIndex = index;
      }),

    setRuntimeVariables: (vars) =>
      set((state) => {
        state.runtimeVariables = vars;
      }),

    setVariableOverride: (path, value) =>
      set((state) => {
        if (value) {
          state.variableOverrides[path] = value;
        } else {
          delete state.variableOverrides[path];
        }
      }),

    clearVariableOverrides: () =>
      set((state) => {
        state.variableOverrides = {};
      }),

    setError: (error) =>
      set((state) => {
        state.errorMessage = error;
        state.status = "error";
      }),

    setExecutionMeta: (meta) =>
      set((state) => {
        state.executionId = meta.executionId;
        state.totalSteps = meta.totalSteps;
        state.startedAt = meta.startedAt;
      }),

    setHasPersistedExecution: (has) =>
      set((state) => {
        state.hasPersistedExecution = has;
      }),

    applyControllerSnapshot: (snap) =>
      set((state) => {
        if (
          state.executionId === snap.executionId &&
          state.status === snap.state &&
          state.currentStepIndex === snap.currentStepIndex &&
          state.snapshots === snap.snapshots &&
          state.errorMessage === snap.errorMessage &&
          state.completedAt === snap.completedAt
        ) {
          return;
        }

        // Direct assignment of references produced by the controller
        state.executionId = snap.executionId;
        state.status = snap.state;
        state.currentStepIndex = snap.currentStepIndex;
        state.totalSteps = snap.totalSteps;
        state.snapshots = snap.snapshots;
        state.runtimeVariables = snap.runtimeVariables;
        state.variableOverrides = snap.variableOverrides;
        state.errorMessage = snap.errorMessage;
        state.startedAt = snap.startedAt;
        state.completedAt = snap.completedAt;
      }),
  })),
);

export type { ExecutionState };
