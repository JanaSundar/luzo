import type { StateCreator } from "zustand";
import type { Pipeline, PipelineExecutionResult, PipelineStep, PipelineView } from "@/types";
import type {
  FlowDocument,
  FlowNodeRecord,
  RequestDefinition,
  SubflowDefinition,
  WorkflowNodeKind,
} from "@/types/workflow";

export interface PipelineSlice {
  pipelines: Pipeline[];
  activePipelineId: string | null;
  currentView: PipelineView;

  setActivePipeline: (id: string | null) => void;
  setView: (view: PipelineView) => void;
  addPipeline: (name: string) => void;
  insertPipeline: (pipeline: Pipeline) => void;
  mergeMissingPipelines: (pipelines: Pipeline[]) => void;
  updatePipeline: (id: string, partial: Partial<Pipeline>) => void;
  deletePipeline: (id: string) => void;
  deletePipelines: (ids: string[]) => void;
  duplicatePipeline: (id: string) => void;
}

export interface StepSlice {
  addStep: (pipelineId: string, step: Omit<PipelineStep, "id">) => void;
  updateStep: (pipelineId: string, stepId: string, partial: Partial<PipelineStep>) => void;
  removeStep: (pipelineId: string, stepId: string) => void;
  reorderSteps: (pipelineId: string, stepIds: string[]) => void;
  duplicateStep: (pipelineId: string, stepId: string) => void;
}

export interface NodeSlice {
  selectedNodeIds: Record<string, string | null>;
  setSelectedNodeId: (pipelineId: string, nodeId: string | null) => void;
  getSelectedNodeId: (pipelineId: string) => string | null;
  addNode: (
    pipelineId: string,
    kind: WorkflowNodeKind,
    position?: { x: number; y: number },
  ) => string | null;
  updateNode: (pipelineId: string, nodeId: string, partial: Partial<FlowNodeRecord>) => void;
  replaceFlowDocument: (pipelineId: string, flowDocument: FlowDocument) => void;
  removeNode: (pipelineId: string, nodeId: string) => void;
  duplicateNode: (pipelineId: string, nodeId: string) => string | null;
}

export interface SubflowSlice {
  subflowDefinitions: SubflowDefinition[];
  createSubflowFromStep: (pipelineId: string, stepId: string) => string | null;
  insertSubflow: (pipelineId: string, subflowId: string, version?: number) => string | null;
  deleteSubflowDefinition: (subflowId: string, version?: number) => void;
  updateSubflowRequest: (
    subflowId: string,
    version: number,
    requestId: string,
    partial: Partial<RequestDefinition>,
  ) => void;
  updateSubflowNode: (
    pipelineId: string,
    nodeId: string,
    partial: Partial<NonNullable<FlowNodeRecord["config"]>>,
  ) => void;
}

export interface ExecutionSlice {
  executing: boolean;
  executionResult: PipelineExecutionResult | null;
  setExecuting: (executing: boolean) => void;
  setExecutionResult: (result: PipelineExecutionResult | null) => void;
}

export type PipelineStore = PipelineSlice & StepSlice & NodeSlice & SubflowSlice & ExecutionSlice;
export type PipelineMutator = [["zustand/immer", never]];
export type PipelineSliceCreator<T> = StateCreator<PipelineStore, PipelineMutator, [], T>;
