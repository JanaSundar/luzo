import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  createDefaultNodeConfig,
  createEmptyRequestStep,
  createFlowNodeRecord,
  ensurePipelineFlowDocument,
} from "@/features/pipeline/canvas-flow";
import { createPipelineRecord } from "@/features/pipeline/createPipelineRecord";
import { createIndexedDbStorage } from "@/services/storage/zustand-indexeddb";
import type { Pipeline, PipelineExecutionResult, PipelineStep, PipelineView } from "@/types";
import type { FlowDocument, FlowNodeRecord, WorkflowNodeKind } from "@/types/workflow";

interface PipelineState {
  pipelines: Pipeline[];
  activePipelineId: string | null;
  currentView: PipelineView;
  selectedNodeIds: Record<string, string | null>;

  setActivePipeline: (id: string | null) => void;
  setView: (view: PipelineView) => void;
  setSelectedNodeId: (pipelineId: string, nodeId: string | null) => void;
  getSelectedNodeId: (pipelineId: string) => string | null;
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
  addNode: (
    pipelineId: string,
    kind: WorkflowNodeKind,
    position?: { x: number; y: number },
  ) => string | null;
  updateNode: (pipelineId: string, nodeId: string, partial: Partial<FlowNodeRecord>) => void;
  replaceFlowDocument: (pipelineId: string, flowDocument: FlowDocument) => void;
  removeNode: (pipelineId: string, nodeId: string) => void;
  duplicateNode: (pipelineId: string, nodeId: string) => string | null;
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
  selectedNodeIds: {} as Record<string, string | null>,
  executing: false,
  executionResult: null as PipelineExecutionResult | null,
};

export const usePipelineStore = create<PipelineState>()(
  persist(
    immer((set, get) => ({
      ...INITIAL_STATE,

      setActivePipeline: (activePipelineId) => set({ activePipelineId }),
      setView: (currentView) => set({ currentView }),
      setSelectedNodeId: (pipelineId, nodeId) =>
        set((state) => {
          state.selectedNodeIds[pipelineId] = nodeId;
        }),
      getSelectedNodeId: (pipelineId) => get().selectedNodeIds[pipelineId] ?? null,

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
          state.pipelines.push({
            ...pipeline,
            flowDocument: ensurePipelineFlowDocument(pipeline),
          });
          state.activePipelineId = pipeline.id;
        }),

      mergeMissingPipelines: (pipelines) =>
        set((state) => {
          const existingIds = new Set(state.pipelines.map((entry) => entry.id));
          const missing = pipelines.filter((pipeline) => !existingIds.has(pipeline.id));
          if (missing.length === 0) return;

          state.pipelines.push(
            ...missing.map((pipeline) => ({
              ...pipeline,
              flowDocument: ensurePipelineFlowDocument(pipeline),
            })),
          );
          if (!state.activePipelineId) {
            state.activePipelineId = missing[0]?.id ?? state.pipelines[0]?.id ?? null;
          }
        }),

      updatePipeline: (id, partial) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === id);
          if (!pipeline) return;
          Object.assign(pipeline, partial);
          if (partial.name && pipeline.flowDocument) {
            pipeline.flowDocument.name = partial.name;
            pipeline.flowDocument.updatedAt = new Date().toISOString();
          }
          if (partial.flowDocument) {
            pipeline.flowDocument = partial.flowDocument;
          }
          pipeline.updatedAt = new Date().toISOString();
        }),

      deletePipeline: (id) => {
        set((state) => {
          state.pipelines = state.pipelines.filter((entry) => entry.id !== id);
          if (state.activePipelineId === id) {
            state.activePipelineId = state.pipelines[0]?.id ?? null;
          }
          delete state.selectedNodeIds[id];
        });
      },

      deletePipelines: (ids) => {
        set((state) => {
          state.pipelines = state.pipelines.filter((entry) => !ids.includes(entry.id));
          if (state.activePipelineId && ids.includes(state.activePipelineId)) {
            state.activePipelineId = state.pipelines[0]?.id ?? null;
          }
          ids.forEach((id) => {
            delete state.selectedNodeIds[id];
          });
        });
      },

      duplicatePipeline: (id) =>
        set((state) => {
          const original = state.pipelines.find((entry) => entry.id === id);
          if (!original) return;
          const copyId = crypto.randomUUID();
          const copy: Pipeline = {
            ...original,
            id: copyId,
            name: `${original.name} (Copy)`,
            steps: original.steps.map((step) => ({ ...step, id: crypto.randomUUID() })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const originalFlow = ensurePipelineFlowDocument(original);
          const requestIdMap = new Map(
            original.steps.map((step, index) => [step.id, copy.steps[index]?.id ?? step.id]),
          );
          copy.flowDocument = {
            ...originalFlow,
            id: copyId,
            name: `${original.name} (Copy)`,
            createdAt: copy.createdAt,
            updatedAt: copy.updatedAt,
            nodes: originalFlow.nodes.map((node) => {
              if (node.kind === "start") {
                return {
                  ...node,
                  id: `${copyId}:start`,
                };
              }
              if (node.kind === "request") {
                const nextRequestRef =
                  requestIdMap.get(node.requestRef ?? node.dataRef ?? node.id) ?? node.id;
                return {
                  ...node,
                  id: nextRequestRef,
                  requestRef: nextRequestRef,
                  dataRef: nextRequestRef,
                };
              }
              return {
                ...node,
                id: crypto.randomUUID(),
              };
            }),
          };
          const oldToNewNodeId = new Map<string, string>(
            originalFlow.nodes.map((node, index) => [
              node.id,
              copy.flowDocument?.nodes[index]?.id ?? node.id,
            ]),
          );
          if (copy.flowDocument) {
            copy.flowDocument.edges = originalFlow.edges.map((edge) => ({
              ...edge,
              id: crypto.randomUUID(),
              source: oldToNewNodeId.get(edge.source) ?? edge.source,
              target: oldToNewNodeId.get(edge.target) ?? edge.target,
            }));
          }
          state.pipelines.push(copy);
          state.activePipelineId = copy.id;
        }),

      addStep: (pipelineId, step) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          const newStep = {
            ...step,
            id: crypto.randomUUID(),
            requestSource: step.requestSource ?? { mode: "new" },
          } as PipelineStep;
          pipeline.steps.push(newStep);
          const flow = ensurePipelineFlowDocument(pipeline);
          const requestNodes = flow.nodes.filter((node) => node.kind === "request");
          flow.nodes.push(
            createFlowNodeRecord(
              "request",
              {
                x: 320 + requestNodes.length * 280,
                y: requestNodes.length % 2 === 0 ? 0 : 160,
              },
              {
                id: newStep.id,
                dataRef: newStep.id,
                requestRef: newStep.id,
                config: { kind: "request", label: newStep.name },
              },
            ),
          );
          pipeline.flowDocument = ensurePipelineFlowDocument({
            ...pipeline,
            flowDocument: flow,
          });
          pipeline.updatedAt = new Date().toISOString();
        }),

      updateStep: (pipelineId, stepId, partial) =>
        set((state) => {
          const step = findPipelineStep(state.pipelines, pipelineId, stepId);
          if (!step) return;
          Object.assign(step.step, partial);
          const flow = ensurePipelineFlowDocument(step.pipeline);
          const requestNode = flow.nodes.find(
            (node) => (node.requestRef ?? node.dataRef ?? node.id) === stepId,
          );
          if (requestNode && requestNode.config?.kind === "request" && partial.name) {
            requestNode.config = { ...requestNode.config, label: partial.name };
          }
          step.pipeline.flowDocument = flow;
          step.pipeline.updatedAt = new Date().toISOString();
        }),

      removeStep: (pipelineId, stepId) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          pipeline.steps = pipeline.steps.filter((step) => step.id !== stepId);
          const flow = ensurePipelineFlowDocument(pipeline);
          flow.nodes = flow.nodes.filter(
            (node) => (node.requestRef ?? node.dataRef ?? node.id) !== stepId,
          );
          flow.edges = flow.edges.filter(
            (edge) => edge.source !== stepId && edge.target !== stepId,
          );
          pipeline.flowDocument = ensurePipelineFlowDocument({
            ...pipeline,
            flowDocument: flow,
          });
          if (state.selectedNodeIds[pipelineId] === stepId) {
            state.selectedNodeIds[pipelineId] = null;
          }
          pipeline.updatedAt = new Date().toISOString();
        }),

      reorderSteps: (pipelineId, stepIds) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          pipeline.steps = stepIds
            .map((stepId) => pipeline.steps.find((step) => step.id === stepId))
            .filter((step): step is PipelineStep => Boolean(step));
          if (pipeline.flowDocument) {
            const flow = ensurePipelineFlowDocument(pipeline);
            const nodeMap = new Map(flow.nodes.map((node) => [node.id, node]));
            const reorderedRequests = stepIds
              .map((stepId) => nodeMap.get(stepId))
              .filter((node): node is NonNullable<typeof node> => Boolean(node));
            const nonRequests = flow.nodes.filter((node) => node.kind !== "request");
            flow.nodes = [...nonRequests, ...reorderedRequests];
            flow.updatedAt = new Date().toISOString();
            pipeline.flowDocument = flow;
          }
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
            requestSource: step.step.requestSource
              ? { ...step.step.requestSource, mode: "detached" }
              : { mode: "new" },
          };
          step.pipeline.steps.splice(step.index + 1, 0, stepCopy);
          const flow = ensurePipelineFlowDocument(step.pipeline);
          const sourceNode = flow.nodes.find(
            (node) => (node.requestRef ?? node.dataRef ?? node.id) === stepId,
          );
          flow.nodes.push(
            createFlowNodeRecord(
              "request",
              sourceNode
                ? { x: sourceNode.position.x + 64, y: sourceNode.position.y + 64 }
                : { x: (step.index + 1) * 280, y: 0 },
              {
                id: stepCopy.id,
                dataRef: stepCopy.id,
                requestRef: stepCopy.id,
                config: { kind: "request", label: stepCopy.name },
              },
            ),
          );
          step.pipeline.flowDocument = ensurePipelineFlowDocument({
            ...step.pipeline,
            flowDocument: flow,
          });
          step.pipeline.updatedAt = new Date().toISOString();
        }),

      addNode: (pipelineId, kind, position) => {
        let createdNodeId: string | null = null;
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          const flow = ensurePipelineFlowDocument(pipeline);
          if (kind === "start" && flow.nodes.some((node) => node.kind === "start")) {
            createdNodeId = flow.nodes.find((node) => node.kind === "start")?.id ?? null;
            return;
          }

          if (kind === "request") {
            const step = createEmptyRequestStep(`Request ${pipeline.steps.length + 1}`);
            pipeline.steps.push(step);
            const node = createFlowNodeRecord(
              "request",
              position ?? { x: 320 + pipeline.steps.length * 80, y: 40 },
              {
                id: step.id,
                dataRef: step.id,
                requestRef: step.id,
                config: { kind: "request", label: step.name },
              },
            );
            flow.nodes.push(node);
            createdNodeId = node.id;
          } else {
            const node = createFlowNodeRecord(kind, position ?? { x: 320, y: 200 }, {
              config: createDefaultNodeConfig(kind),
            });
            flow.nodes.push(node);
            createdNodeId = node.id;
          }

          pipeline.flowDocument = ensurePipelineFlowDocument({
            ...pipeline,
            flowDocument: flow,
          });
          state.selectedNodeIds[pipelineId] = createdNodeId;
          pipeline.updatedAt = new Date().toISOString();
        });
        return createdNodeId;
      },

      updateNode: (pipelineId, nodeId, partial) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          const flow = ensurePipelineFlowDocument(pipeline);
          const node = flow.nodes.find((entry) => entry.id === nodeId);
          if (!node) return;
          Object.assign(node, partial);
          if (partial.config) {
            node.config = {
              ...(node.config ?? createDefaultNodeConfig(node.kind)),
              ...partial.config,
            } as FlowNodeRecord["config"];
          }
          flow.updatedAt = new Date().toISOString();
          pipeline.flowDocument = flow;
          pipeline.updatedAt = new Date().toISOString();
        }),

      replaceFlowDocument: (pipelineId, flowDocument) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          pipeline.flowDocument = {
            ...flowDocument,
            name: pipeline.name,
            updatedAt: new Date().toISOString(),
          };
          pipeline.updatedAt = new Date().toISOString();
        }),

      removeNode: (pipelineId, nodeId) =>
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          const flow = ensurePipelineFlowDocument(pipeline);
          const node = flow.nodes.find((entry) => entry.id === nodeId);
          if (!node || node.kind === "start") return;
          if (node.kind === "request") {
            const requestRef = node.requestRef ?? node.dataRef ?? node.id;
            pipeline.steps = pipeline.steps.filter((step) => step.id !== requestRef);
          }
          flow.nodes = flow.nodes.filter((entry) => entry.id !== nodeId);
          flow.edges = flow.edges.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId,
          );
          pipeline.flowDocument = ensurePipelineFlowDocument({
            ...pipeline,
            flowDocument: flow,
          });
          if (state.selectedNodeIds[pipelineId] === nodeId) {
            state.selectedNodeIds[pipelineId] = null;
          }
          pipeline.updatedAt = new Date().toISOString();
        }),

      duplicateNode: (pipelineId, nodeId) => {
        let duplicatedId: string | null = null;
        set((state) => {
          const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
          if (!pipeline) return;
          const flow = ensurePipelineFlowDocument(pipeline);
          const node = flow.nodes.find((entry) => entry.id === nodeId);
          if (!node || node.kind === "start") return;
          if (node.kind === "request") {
            const sourceRef = node.requestRef ?? node.dataRef ?? node.id;
            const step = pipeline.steps.find((entry) => entry.id === sourceRef);
            if (!step) return;
            const stepCopy: PipelineStep = {
              ...step,
              id: crypto.randomUUID(),
              name: `${step.name} (Copy)`,
              requestSource: step.requestSource
                ? { ...step.requestSource, mode: "detached" as const }
                : { mode: "new" as const },
            };
            pipeline.steps.push(stepCopy);
            const nodeCopy = createFlowNodeRecord(
              "request",
              {
                x: node.position.x + 64,
                y: node.position.y + 64,
              },
              {
                dataRef: stepCopy.id,
                requestRef: stepCopy.id,
                id: stepCopy.id,
                config: { kind: "request", label: stepCopy.name },
                size: node.size,
              },
            );
            flow.nodes.push(nodeCopy);
            duplicatedId = nodeCopy.id;
          } else {
            const nodeCopy = createFlowNodeRecord(
              node.kind,
              {
                x: node.position.x + 64,
                y: node.position.y + 64,
              },
              {
                config: node.config,
                size: node.size,
              },
            );
            flow.nodes.push(nodeCopy);
            duplicatedId = nodeCopy.id;
          }
          pipeline.flowDocument = ensurePipelineFlowDocument({
            ...pipeline,
            flowDocument: flow,
          });
          state.selectedNodeIds[pipelineId] = duplicatedId;
          pipeline.updatedAt = new Date().toISOString();
        });
        return duplicatedId;
      },

      setExecuting: (executing) => set({ executing }),
      setExecutionResult: (executionResult) => set({ executionResult }),
    })),
    {
      name: "luzo-collections-store",
      storage: createJSONStorage(() => createIndexedDbStorage({ dbName: "luzo-collections" })),
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<PipelineState>) };
        if (!merged.pipelines) return merged;
        return {
          ...merged,
          pipelines: merged.pipelines.map((pipeline) => ({
            ...pipeline,
            flowDocument: ensurePipelineFlowDocument(pipeline),
          })),
        };
      },
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
