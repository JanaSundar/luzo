import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { AutomationSequence, AutomationStep } from "@/types";

interface AutomationState {
  sequences: AutomationSequence[];
  isRecording: boolean;
  currentSequence: AutomationStep[];

  // Actions
  startRecording: () => void;
  stopRecording: (name: string) => void;
  addStep: (step: Omit<AutomationStep, "id" | "timestamp">) => void;
  updateStep: (id: string, updates: Partial<AutomationStep>) => void;
  deleteSequence: (id: string) => void;
  setSequences: (sequences: AutomationSequence[]) => void;
  clearHistory: () => void;
}

export const useAutomationStore = create<AutomationState>()(
  persist(
    immer<AutomationState>((set) => ({
      sequences: [] as AutomationSequence[],
      isRecording: false,
      currentSequence: [] as AutomationStep[],

      startRecording: () =>
        set((state) => {
          state.isRecording = true;
          state.currentSequence = [];
        }),

      stopRecording: (name) =>
        set((state) => {
          state.isRecording = false;
          state.sequences.unshift({
            id: crypto.randomUUID(),
            name: name || `Sequence ${state.sequences.length + 1}`,
            steps: [...state.currentSequence],
            createdAt: Date.now(),
          });
          state.currentSequence = [];
        }),

      addStep: (step) =>
        set((state) => {
          if (!state.isRecording) return;
          state.currentSequence.push({
            ...step,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
          });
        }),

      updateStep: (id, updates) =>
        set((state) => {
          const stepIndex = state.currentSequence.findIndex((s) => s.id === id);
          if (stepIndex !== -1) {
            state.currentSequence[stepIndex] = { ...state.currentSequence[stepIndex], ...updates };
          }

          for (const seq of state.sequences) {
            const seqStepIndex = seq.steps.findIndex((s) => s.id === id);
            if (seqStepIndex !== -1) {
              seq.steps[seqStepIndex] = { ...seq.steps[seqStepIndex], ...updates };
            }
          }
        }),

      deleteSequence: (id) =>
        set((state) => {
          state.sequences = state.sequences.filter((s) => s.id !== id);
        }),

      setSequences: (sequences) =>
        set((state) => {
          state.sequences = sequences;
        }),

      clearHistory: () =>
        set((state) => {
          state.sequences = [];
        }),
    })),
    {
      name: "luzo-automation-storage",
    }
  )
);
