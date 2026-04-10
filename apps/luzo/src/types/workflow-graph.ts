import type { ApiRequest, ConditionRule } from "./index";
export type WorkflowNodeKind =
  | "start"
  | "end"
  | "request"
  | "condition"
  | "delay"
  | "poll"
  | "transform"
  | "forEach"
  | "log"
  | "assert"
  | "webhookWait"
  | "switch";

export type FlowEdgeSemantics =
  | "control"
  | "success"
  | "failure"
  | "true"
  | "false"
  | (string & {});

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
  rules: ConditionRule[];
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

export interface ForEachNodeConfig {
  kind: "forEach";
  label: string;
  collectionPath: string;
  mapExpression?: string;
}

export interface LogNodeConfig {
  kind: "log";
  label: string;
  message: string;
}

export interface AssertNodeConfig {
  kind: "assert";
  label: string;
  expression: string;
  message?: string;
}

export interface WebhookWaitNodeConfig {
  kind: "webhookWait";
  label: string;
  timeoutMs?: number;
  correlationKey?: string;
}

export interface PollNodeConfig {
  kind: "poll";
  label: string;
  stopCondition: string;
  intervalMs?: number;
  maxAttempts?: number;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs?: number;
  strategy?: "fixed" | "exponential";
}

export interface EndNodeConfig {
  kind: "end";
  label: string;
}

export interface SwitchCase {
  id: string;
  label: string;
  expression: string;
  isDefault: boolean;
}

export interface SwitchNodeConfig {
  kind: "switch";
  label: string;
  cases: SwitchCase[];
}

export type FlowNodeConfig =
  | StartNodeConfig
  | RequestNodeConfig
  | ConditionNodeConfig
  | DelayNodeConfig
  | TransformNodeConfig
  | ForEachNodeConfig
  | LogNodeConfig
  | AssertNodeConfig
  | WebhookWaitNodeConfig
  | PollNodeConfig
  | EndNodeConfig
  | SwitchNodeConfig;

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

export interface FlowNodeGeometry {
  position: { x: number; y: number };
  size?: { width: number; height: number };
  parentId?: string;
}

export interface FlowNodeViewState {
  collapsed?: boolean;
  selected?: boolean;
  [key: string]: unknown;
}

export interface FlowNodeRecord {
  id: string;
  kind: WorkflowNodeKind;
  geometry: FlowNodeGeometry;
  config: FlowNodeConfig;
  view?: FlowNodeViewState;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  dataRef?: string;
  requestRef?: string;
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

export interface WorkflowBundle {
  flow: FlowDocument;
  workflow: WorkflowDefinition;
  registry: RequestRegistry;
}
