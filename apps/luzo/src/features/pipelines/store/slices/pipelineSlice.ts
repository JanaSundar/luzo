import { ensurePipelineFlowDocument } from "@/features/pipeline/canvas-flow";
import { createPipelineRecord } from "@/features/pipeline/createPipelineRecord";
import type { PipelineSliceCreator, PipelineSlice } from "../types";
import type { Pipeline } from "@/types";

export const createPipelineSlice: PipelineSliceCreator<
  Pick<
    PipelineSlice,
    | "pipelines"
    | "activePipelineId"
    | "currentView"
    | "setActivePipeline"
    | "setView"
    | "addPipeline"
    | "insertPipeline"
    | "mergeMissingPipelines"
    | "updatePipeline"
    | "deletePipeline"
    | "deletePipelines"
    | "duplicatePipeline"
  >
> = (set) => ({
  pipelines: [],
  activePipelineId: null,
  currentView: "builder",

  setActivePipeline: (activePipelineId) => set({ activePipelineId }),
  setView: (currentView) => set({ currentView }),

  addPipeline: (name) =>
    set((state) => {
      const pipeline = createPipelineRecord(name || `New Pipeline ${state.pipelines.length + 1}`);
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

  deletePipeline: (id) =>
    set((state) => {
      state.pipelines = state.pipelines.filter((entry) => entry.id !== id);
      if (state.activePipelineId === id) {
        state.activePipelineId = state.pipelines[0]?.id ?? null;
      }
      delete state.selectedNodeIds[id];
    }),

  deletePipelines: (ids) =>
    set((state) => {
      state.pipelines = state.pipelines.filter((entry) => !ids.includes(entry.id));
      if (state.activePipelineId && ids.includes(state.activePipelineId)) {
        state.activePipelineId = state.pipelines[0]?.id ?? null;
      }
      ids.forEach((id) => {
        delete state.selectedNodeIds[id];
      });
    }),

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
});
