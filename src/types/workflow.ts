import type { ApiRequest } from "./index";
import type { TimelineEvent, TimelineEventStatus } from "./timeline-event";

export type WorkflowNodeKind =
  | "start"
  | "end"
  | "request"
  | "condition"
  | "delay"
  | "poll"
  | "transform"
  | "subflow";

export type FlowEdgeSemantics = "control" | "success" | "failure" | "true" | "false";

export interface StartNodeConfig {
  kind: "start";
  label: string;
}

export interface RequestNodeConfig {
  kind: "request";
  label?: string;
}

export interface ConditionNodeConfig {
  kind: "condition";
  label: string;
  expression: string;
}

export interface DelayNodeConfig {
  kind: "delay";
  label: string;
  durationMs: number;
}

export interface TransformNodeConfig {
  kind: "transform";
  label: string;
  script: string;
}

export interface SubflowInputDefinition {
  key: string;
  label: string;
  required: boolean;
  defaultValue?: string;
}

export interface SubflowOutputDefinition {
  key: string;
  label: string;
  path: string;
}

export interface SubflowDefinition {
  id: string;
  name: string;
  version: number;
  description?: string;
  workflow: WorkflowDefinition;
  registry: RequestRegistry;
  inputSchema: SubflowInputDefinition[];
  outputSchema: SubflowOutputDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface SubflowNodeConfig {
  kind: "subflow";
  label: string;
  subflowId: string;
  subflowVersion: number;
  inputBindings: Record<string, string>;
  outputAliases: Record<string, string>;
  definition?: SubflowDefinition;
}

export interface EndNodeConfig {
  kind: "end";
  label: string;
}

export type FlowNodeConfig =
  | StartNodeConfig
  | RequestNodeConfig
  | ConditionNodeConfig
  | DelayNodeConfig
  | SubflowNodeConfig
  | TransformNodeConfig
  | EndNodeConfig;

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs?: number;
  strategy?: "fixed" | "exponential";
}

export interface FlowDocument {
  kind: "flow-document";
  version: 1;
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  viewport: { x: number; y: number; zoom: number };
  nodes: FlowNodeRecord[];
  edges: FlowEdgeRecord[];
}

export interface FlowNodeRecord {
  id: string;
  kind: WorkflowNodeKind;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  dataRef?: string;
  requestRef?: string;
  config?: FlowNodeConfig;
}

export interface FlowEdgeRecord {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  semantics: FlowEdgeSemantics;
}

export interface WorkflowDefinition {
  kind: "workflow-definition";
  version: 1;
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  entryNodeIds: string[];
  requestRegistryId: string;
}

export interface WorkflowNode {
  id: string;
  kind: WorkflowNodeKind;
  configRef?: string;
  requestRef?: string;
  config?: FlowNodeConfig;
  retryPolicy?: RetryPolicy;
  source?: {
    collectionId?: string;
    mode?: "detached" | "linked" | "new";
    requestId?: string;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  semantics: FlowEdgeSemantics;
}

export interface RequestDefinition extends ApiRequest {
  id: string;
  name: string;
}

export interface RequestRegistry {
  kind: "request-registry";
  version: 1;
  id: string;
  createdAt?: string;
  updatedAt?: string;
  requests: Record<string, RequestDefinition>;
}

export interface RuntimeRoute {
  semantics: FlowEdgeSemantics;
  targetId: string;
}

export interface ExecutionStage {
  stageIndex: number;
  nodeIds: string[];
}

export interface CompiledPipelineNode {
  nodeId: string;
  kind: WorkflowNodeKind;
  orderIndex: number;
  stageIndex: number;
  dependencyIds: string[];
  activationIds: string[];
  downstreamIds: string[];
  entry: boolean;
  requestRef?: string;
  routes: {
    control: string[];
    failure: string[];
    success: string[];
  };
  runtimeRoutes: RuntimeRoute[];
  branch?: { mode: "all" | "true" | "false" | "success" | "failure" };
}

export interface CompiledPipelinePlan {
  kind: "compiled-pipeline-plan";
  version: 1;
  workflowId: string;
  entryNodeIds: string[];
  aliases: Array<{
    stepId: string;
    alias: string;
    index: number;
    refs: string[];
  }>;
  nodes: CompiledPipelineNode[];
  stages: ExecutionStage[];
  order: string[];
  adjacency: Record<string, string[]>;
  reverseAdjacency: Record<string, string[]>;
}

export type ExecutionPlanNode = CompiledPipelineNode;
export type ExecutionPlan = CompiledPipelinePlan;

export interface TimelineIndex {
  executionId: string;
  orderedEventIds: string[];
  byId: Record<string, TimelineEvent>;
  byStepId: Record<string, string[]>;
  byNodeId: Record<string, string[]>;
  byStatus: Record<TimelineEventStatus, string[]>;
  byBranchId: Record<string, string[]>;
  byAttempt: Record<string, string[]>;
  byOutcome: Record<string, string[]>;
  byLineagePath: Record<string, string[]>;
  timeBounds: { min: number | null; max: number | null };
}

export interface WorkflowBundle {
  flow: FlowDocument;
  workflow: WorkflowDefinition;
  registry: RequestRegistry;
}
