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

export interface EndNodeConfig {
  kind: "end";
  label: string;
}

export type FlowNodeConfig =
  | StartNodeConfig
  | RequestNodeConfig
  | ConditionNodeConfig
  | DelayNodeConfig
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

export interface ExecutionStage {
  stageIndex: number;
  nodeIds: string[];
}

export interface ExecutionPlanNode {
  nodeId: string;
  kind: WorkflowNodeKind;
  stageIndex: number;
  dependencyIds: string[];
  downstreamIds: string[];
  requestRef?: string;
  routes?: {
    control: string[];
    failure: string[];
    success: string[];
  };
  branch?: { mode: "all" | "true" | "false" | "success" | "failure" };
}

export interface ExecutionPlan {
  kind: "execution-plan";
  version: 1;
  workflowId: string;
  nodes: ExecutionPlanNode[];
  stages: ExecutionStage[];
  order: string[];
  adjacency: Record<string, string[]>;
  reverseAdjacency: Record<string, string[]>;
}

export interface TimelineIndex {
  executionId: string;
  orderedEventIds: string[];
  byId: Record<string, TimelineEvent>;
  byStepId: Record<string, string[]>;
  byStatus: Record<TimelineEventStatus, string[]>;
  byBranchId: Record<string, string[]>;
  byAttempt: Record<string, string[]>;
  timeBounds: { min: number | null; max: number | null };
}

export interface WorkflowBundle {
  flow: FlowDocument;
  workflow: WorkflowDefinition;
  registry: RequestRegistry;
}
