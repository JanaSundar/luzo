import type { StepAlias, ValidationError } from "./pipeline-runtime";
import type { TimelineEvent, TimelineEventStatus } from "./timeline-event";
import type {
  ExecutionPlan,
  FlowDocument,
  RequestRegistry,
  TimelineIndex,
  WorkflowDefinition,
} from "./workflow";

export type EngineErrorCode =
  | "cycle_detected"
  | "invalid_branch_edge"
  | "invalid_edge"
  | "invalid_node"
  | "missing_node"
  | "missing_request_ref"
  | "unreachable_node"
  | "unsupported_node_kind";

export interface EngineComputationError {
  code: EngineErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: EngineComputationError };

export interface DagValidationResult {
  valid: boolean;
  errors: ValidationError[];
  order: string[];
  stages: string[][];
  adjacency: Record<string, string[]>;
  reverseAdjacency: Record<string, string[]>;
  unreachableNodeIds: string[];
}

export interface ValidateDagInput {
  workflow: WorkflowDefinition;
}

export interface CompilePlanInput {
  workflow: WorkflowDefinition;
  registry: RequestRegistry;
}

export interface CompilePlanOutput {
  plan: ExecutionPlan;
  aliases: StepAlias[];
  warnings: ValidationError[];
}

export interface VariableReference {
  nodeId: string;
  field: string;
  rawRef: string;
  alias: string | null;
  path: string | null;
}

export interface VariableAnalysisOutput {
  aliases: StepAlias[];
  references: VariableReference[];
  unresolved: VariableReference[];
  reverseDependencies: Record<string, string[]>;
}

export interface TimelineFilterInput {
  index: TimelineIndex;
  stepIds?: string[];
  statuses?: TimelineEventStatus[];
  branchIds?: string[];
  attemptKeys?: string[];
  timeRange?: { from?: number; to?: number };
}

export interface TimelineFilterOutput {
  eventIds: string[];
  events: TimelineEvent[];
}

export interface ReplayStateAtOutput {
  timestamp: number;
  events: TimelineEvent[];
  latestByStepId: Record<string, TimelineEvent>;
}

export interface BuildVariableSuggestionsInput {
  pipeline: import("@/types").Pipeline | undefined;
  currentStepId: string;
  envVars?: Record<string, string>;
  executionContext?: Record<string, unknown>;
}

export interface RebuildRuntimeVariablesInput {
  pipeline: import("@/types").Pipeline;
  snapshots: import("@/types/pipeline-runtime").StepSnapshot[];
  upToIndex: number;
}

export interface BuildWorkflowInput {
  flow: FlowDocument;
  registryId: string;
}
