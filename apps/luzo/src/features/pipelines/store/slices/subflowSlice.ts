import { ensurePipelineFlowDocument, createFlowNodeRecord } from "@/features/pipeline/canvas-flow";
import {
  createSubflowDefinitionFromStep,
  createSubflowNodeConfig,
} from "@/features/pipeline/subflows";
import type { PipelineSliceCreator, SubflowSlice } from "../types";

export const createSubflowSlice: PipelineSliceCreator<SubflowSlice> = (set) => ({
  subflowDefinitions: [],

  createSubflowFromStep: (pipelineId, stepId) => {
    let createdNodeId: string | null = null;
    set((state) => {
      const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
      if (!pipeline) return;
      const stepIndex = pipeline.steps.findIndex((step) => step.id === stepId);
      const step = pipeline.steps[stepIndex];
      if (!step) return;
      const { definition, inputBindings, legacyAliasRefs, outputAliases } =
        createSubflowDefinitionFromStep(step, pipeline.steps);
      state.subflowDefinitions.push(definition);

      const flow = ensurePipelineFlowDocument(pipeline);
      const node = flow.nodes.find((entry) => entry.id === stepId);
      if (!node) return;
      node.kind = "subflow";
      node.requestRef = undefined;
      node.dataRef = undefined;
      node.config = createSubflowNodeConfig({
        definition,
        inputBindings,
        outputAliases,
        legacyAliasRefs,
      });

      pipeline.steps.splice(stepIndex, 1);
      pipeline.flowDocument = ensurePipelineFlowDocument({
        ...pipeline,
        flowDocument: flow,
      });
      createdNodeId = node.id;
      state.selectedNodeIds[pipelineId] = node.id;
      pipeline.updatedAt = new Date().toISOString();
    });
    return createdNodeId;
  },

  insertSubflow: (pipelineId, subflowId, version) => {
    let createdNodeId: string | null = null;
    set((state) => {
      const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
      const definition = state.subflowDefinitions.find(
        (entry) => entry.id === subflowId && entry.version === (version ?? entry.version),
      );
      if (!pipeline || !definition) return;
      const flow = ensurePipelineFlowDocument(pipeline);
      const node = createFlowNodeRecord("subflow", {
        x: 320 + flow.nodes.length * 80,
        y: 40,
      });
      node.config = createSubflowNodeConfig({ definition });
      flow.nodes.push(node);

      const visibleNodes = flow.nodes.filter(
        (entry) => entry.kind === "request" || entry.kind === "subflow",
      );
      const previousNode = visibleNodes.at(-2);
      if (previousNode) {
        flow.edges.push({
          id: crypto.randomUUID(),
          source: previousNode.id,
          target: node.id,
          semantics: "control",
        });
      }

      pipeline.flowDocument = ensurePipelineFlowDocument({
        ...pipeline,
        flowDocument: flow,
      });
      pipeline.updatedAt = new Date().toISOString();
      state.selectedNodeIds[pipelineId] = node.id;
      createdNodeId = node.id;
    });
    return createdNodeId;
  },

  deleteSubflowDefinition: (subflowId, version) =>
    set((state) => {
      state.subflowDefinitions = state.subflowDefinitions.filter(
        (definition) =>
          definition.id !== subflowId || (version !== undefined && definition.version !== version),
      );
    }),

  updateSubflowRequest: (subflowId, version, requestId, partial) =>
    set((state) => {
      const definition = state.subflowDefinitions.find(
        (entry) => entry.id === subflowId && entry.version === version,
      );
      if (!definition) return;
      const request = definition.registry.requests[requestId];
      if (!request) return;

      Object.assign(request, partial);
      const workflowNode = definition.workflow.nodes.find(
        (node) => node.requestRef === requestId || node.id === requestId,
      );
      if (partial.name && workflowNode?.config?.kind === "request") {
        workflowNode.config = {
          ...workflowNode.config,
          label: partial.name,
        };
      }
      definition.updatedAt = new Date().toISOString();
      definition.registry.updatedAt = definition.updatedAt;
      definition.workflow.updatedAt = definition.updatedAt;
    }),

  updateSubflowNode: (pipelineId, nodeId, partial) =>
    set((state) => {
      const pipeline = state.pipelines.find((entry) => entry.id === pipelineId);
      if (!pipeline) return;
      const flow = ensurePipelineFlowDocument(pipeline);
      const node = flow.nodes.find((entry) => entry.id === nodeId && entry.kind === "subflow");
      if (!node || node.config?.kind !== "subflow") return;
      node.config = { ...node.config, ...partial } as typeof node.config;
      flow.updatedAt = new Date().toISOString();
      pipeline.flowDocument = flow;
      pipeline.updatedAt = new Date().toISOString();
    }),
});
