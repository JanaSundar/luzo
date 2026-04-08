"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  cloneRuntimeRecord,
  cloneSnapshot,
  cloneSnapshots,
} from "@/features/pipeline/pipeline-snapshot-utils";
import type {
  ControllerSnapshot,
  ExecutionMode,
  PipelineExecutionEvent,
  StepSnapshot,
} from "@/types/pipeline-runtime";

interface ExecutionState {
  executionId: string | null;
  status: "idle" | "running" | "paused" | "error" | "completed" | "aborted" | "interrupted";
  originExecutionMode: ExecutionMode;
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
  setOriginExecutionMode: (mode: ExecutionMode) => void;
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
  applyExecutionEvent: (event: PipelineExecutionEvent) => void;
}

const INITIAL_STATE = {
  executionId: null,
  status: "idle" as const,
  originExecutionMode: "auto" as const,
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

    setOriginExecutionMode: (mode) =>
      set((state) => {
        state.originExecutionMode = mode;
      }),

    setSnapshots: (snapshots) =>
      set((state) => {
        state.snapshots = cloneSnapshots(snapshots);
      }),

    appendSnapshot: (snapshot) =>
      set((state) => {
        state.snapshots.push(cloneSnapshot(snapshot));
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
        state.runtimeVariables = cloneRuntimeRecord(vars);
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

    applyExecutionEvent: (event) =>
      set((state) => {
        switch (event.type) {
          case "execution_started":
            state.status = "running";
            state.startedAt = event.startedAt;
            state.totalSteps = event.totalSteps;
            state.errorMessage = null;
            state.completedAt = null;
            return;

          case "step_ready": {
            const existingIndex = state.snapshots.findIndex(
              (snap) => snap.stepId === event.snapshot.stepId,
            );
            const nextSnapshot = cloneSnapshot(event.snapshot);
            if (existingIndex === -1) {
              state.snapshots.push(nextSnapshot);
            } else {
              state.snapshots[existingIndex] = nextSnapshot;
            }
            state.currentStepIndex = event.snapshot.stepIndex;
            return;
          }

          case "step_stream_chunk": {
            const index = state.snapshots.findIndex(
              (snap) => snap.stepId === event.snapshot.stepId,
            );
            const nextSnapshot = cloneSnapshot(event.snapshot);
            if (index === -1) {
              state.snapshots.push(nextSnapshot);
            } else {
              state.snapshots[index] = nextSnapshot;
            }
            return;
          }

          case "step_completed":
          case "condition_evaluated":
          case "step_failed": {
            const index = state.snapshots.findIndex(
              (snap) => snap.stepId === event.snapshot.stepId,
            );
            const nextSnapshot = cloneSnapshot(event.snapshot);
            if (index === -1) {
              state.snapshots.push(nextSnapshot);
            } else {
              state.snapshots[index] = nextSnapshot;
            }
            state.runtimeVariables = cloneRuntimeRecord(event.runtimeVariables);
            if (event.type === "step_failed") {
              state.errorMessage = event.snapshot.error;
              // In debug mode the controller will pause on failure so the
              // execution can continue; only go to "error" in auto mode.
              state.status = state.originExecutionMode === "debug" ? "paused" : "error";
            } else {
              state.currentStepIndex = event.snapshot.stepIndex + 1;
            }
            return;
          }

          case "execution_completed":
            state.status = "completed";
            state.completedAt = event.completedAt;
            return;

          case "execution_interrupted":
            state.status = "interrupted";
            state.completedAt = event.completedAt;
            state.errorMessage = event.reason;
            return;
        }
      }),

    applyControllerSnapshot: (snap) =>
      set((state) => {
        if (
          state.executionId === snap.executionId &&
          state.status === snap.state &&
          state.currentStepIndex === snap.currentStepIndex &&
          state.errorMessage === snap.errorMessage &&
          state.completedAt === snap.completedAt
        ) {
          return;
        }

        state.executionId = snap.executionId;
        state.status = snap.state;
        state.originExecutionMode = snap.originExecutionMode;
        state.currentStepIndex = snap.currentStepIndex;
        state.totalSteps = snap.totalSteps;
        state.snapshots = cloneSnapshots(snap.snapshots);
        state.runtimeVariables = cloneRuntimeRecord(snap.runtimeVariables);
        state.variableOverrides = cloneRuntimeRecord(snap.variableOverrides) as Record<
          string,
          string
        >;
        state.errorMessage = snap.errorMessage;
        state.startedAt = snap.startedAt;
        state.completedAt = snap.completedAt;
      }),
  })),
);

export type { ExecutionState };
