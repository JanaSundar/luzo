import type { TimelineEvent, TimelineEventStatus } from "./timeline-event";
import type {
  AssertNodeConfig,
  ConditionNodeConfig,
  DelayNodeConfig,
  FlowEdgeSemantics,
  ForEachNodeConfig,
  LogNodeConfig,
  PollNodeConfig,
  SwitchNodeConfig,
  TransformNodeConfig,
  WebhookWaitNodeConfig,
  WorkflowNodeKind,
} from "./workflow-graph";

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
  conditionConfig?: ConditionNodeConfig;
  delayConfig?: DelayNodeConfig;
  forEachConfig?: ForEachNodeConfig;
  assertConfig?: AssertNodeConfig;
  logConfig?: LogNodeConfig;
  transformConfig?: TransformNodeConfig;
  webhookWaitConfig?: WebhookWaitNodeConfig;
  pollConfig?: PollNodeConfig;
  switchConfig?: SwitchNodeConfig;
  routes: {
    control: string[];
    failure: string[];
    success: string[];
    true: string[];
    false: string[];
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
