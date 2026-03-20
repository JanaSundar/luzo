import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { createIndexedDbStorage } from "@/lib/storage/zustand-indexeddb";
import type {
  NarrativeTone,
  Pipeline,
  PipelineExecutionResult,
  PipelineStep,
  PipelineView,
} from "@/types";

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
          const pipeline = createPipeline(name || `New Pipeline ${state.pipelines.length + 1}`);
          state.pipelines.push(pipeline);
          state.activePipelineId = pipeline.id;
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
    }
  )
);

function createPipeline(name: string): Pipeline {
  const technicalPrompt = `Perform an exhaustive technical audit as a Senior Performance Engineer:
- Structural Integrity: Validate protocol compliance and orchestration health.
- Performance Analysis: Identify P95/P99 latency spikes and database/cold-start bottlenecks.
- Granular Auditing: Evaluate every request for status-code validity and payload consistency.
- System Insights: Flag scalability issues, technical debt, and architectural risks.
- Engineering Risks: Surface race conditions, resource exhaustion, and security exposures.
- Remediation Roadmap: Provide prioritized, code-level optimizations (caching, indexing, validation).
- Final Assessment: Declare production readiness and stability with precise data.`;

  return {
    id: crypto.randomUUID(),
    name,
    steps: [],
    narrativeConfig: {
      tone: "technical" as NarrativeTone,
      prompt: technicalPrompt,
      enabled: true,
      length: "medium" as const,
      promptOverrides: {
        technical: technicalPrompt,
        executive: `Write a high-level operations summary for leadership export:
- Concise & Scalable: Use business-facing, non-technical language throughout.
- Execution Overview: Summarize test scope, completion status, and business impact.
- Health Summary: Report on reliability, customer impact, and expectation alignment.
- Business Logic Breakdown: Explain per-request outcomes in plain language (e.g., slow, blocked, healthy).
- Strategic Highlights: List 3-5 insights on service stability and speed.
- Escalate Risks: Capture only meaningful business risks requiring ownership or follow-up.
- Recommendations: Provide actionable growth or operational steps for leadership.
- Final Confidence: Close with a clear statement on urgency and production readiness.`,
        compliance: `Audit execution as a Security Representative focused on risk and policy gaps:
- Formal Tone: Use professional audit terminology and remediation-focused objectives.
- Executive Summary: Detail the overall compliance posture and specific violations found.
- Vulnerability Scan: Audit every request for sensitive data exposure or unauthorized logic.
- Risk Classification: Explicitly label all issues as Low, Medium, or High risk.
- Remediation Path: Build a technical roadmap to achieve 100% compliance.
- Certification Statement: Conclude on the pipeline's alignment with current security standards.`,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function findPipelineStep(pipelines: Pipeline[], pipelineId: string, stepId: string) {
  const pipeline = pipelines.find((entry) => entry.id === pipelineId);
  if (!pipeline) return null;
  const index = pipeline.steps.findIndex((step) => step.id === stepId);
  if (index === -1) return null;
  return { pipeline, step: pipeline.steps[index], index };
}
