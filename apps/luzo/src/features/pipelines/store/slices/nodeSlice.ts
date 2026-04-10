import {
  ensurePipelineFlowDocument,
  createFlowNodeRecord,
  createDefaultNodeConfig,
} from "@/features/pipeline/canvas-flow";
import type { PipelineSliceCreator, NodeSlice } from "../types";
import type { PipelineStep } from "@/types";
import type { FlowNodeRecord } from "@/types/workflow";

export const createNodeSlice: PipelineSliceCreator<NodeSlice> = (set, get) => ({
  selectedNodeIds: {},
  setSelectedNodeId: (pipelineId, nodeId) =>
    set((state) => {
      state.selectedNodeIds[pipelineId] = nodeId;
    }),
  getSelectedNodeId: (pipelineId) => get().selectedNodeIds[pipelineId] ?? null,

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
        const step = {
          id: crypto.randomUUID(),
          name: `Request ${pipeline.steps.length + 1}`,
          requestSource: { mode: "new" },
        } as PipelineStep;
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
        } as NonNullable<FlowNodeRecord["config"]>;
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
      flow.edges = flow.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
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
        const stepCopy = {
          ...step,
          id: crypto.randomUUID(),
          name: `${step.name} (Copy)`,
          requestSource: step.requestSource
            ? { ...step.requestSource, mode: "detached" as const }
            : { mode: "new" as const },
        } as PipelineStep;
        pipeline.steps.push(stepCopy);
        const nodeCopy = createFlowNodeRecord(
          "request",
          {
            x: node.geometry.position.x + 64,
            y: node.geometry.position.y + 64,
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
            x: node.geometry.position.x + 64,
            y: node.geometry.position.y + 64,
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
});
