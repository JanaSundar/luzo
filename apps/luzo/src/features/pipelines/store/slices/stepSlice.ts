import { ensurePipelineFlowDocument, createFlowNodeRecord } from "@/features/pipeline/canvas-flow";
import type { PipelineSliceCreator, StepSlice } from "../types";
import { findPipelineStep } from "../utils";
import type { PipelineStep } from "@/types";

export const createStepSlice: PipelineSliceCreator<StepSlice> = (set) => ({
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
      if (!step?.step) return;
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
      flow.edges = flow.edges.filter((edge) => edge.source !== stepId && edge.target !== stepId);
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
      if (!step?.step) return;
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
            ? { x: sourceNode.geometry.position.x + 64, y: sourceNode.geometry.position.y + 64 }
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
});
