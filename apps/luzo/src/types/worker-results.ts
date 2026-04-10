import type { StepAlias, ValidationError } from "./pipeline-runtime";
import type { TimelineEvent, TimelineEventStatus } from "./timeline-event";
import type {
  CompiledPipelinePlan,
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

export interface AnalyzeVariablesInput extends CompilePlanInput {
  executionContext?: Record<string, unknown>;
}

export interface CompilePlanOutput {
  plan: CompiledPipelinePlan;
  aliases: StepAlias[];
  warnings: ValidationError[];
  expandedWorkflow?: WorkflowDefinition;
  expandedRegistry?: RequestRegistry;
}

export interface VariableReference {
  nodeId: string;
  field: string;
  rawRef: string;
  alias: string | null;
  path: string | null;
}

export type LineageResolutionStatus =
  | "resolved"
  | "unresolved_alias"
  | "unresolved_path"
  | "forward_reference"
  | "runtime_only";

export type LineageRiskFlag =
  | "missing_alias"
  | "forward_reference"
  | "unknown_path"
  | "runtime_required";

export interface VariableProducer {
  stepId: string;
  aliases: string[];
  producedRoots: string[];
  availablePaths: string[];
}

export interface VariableReferenceEdge {
  id: string;
  consumerStepId: string;
  consumerField: string;
  rawRef: string;
  sourceStepId: string | null;
  sourceAlias: string | null;
  referencedPath: string | null;
  resolutionStatus: LineageResolutionStatus;
  riskFlags: LineageRiskFlag[];
  controlCritical: boolean;
}

export interface ImpactRecord {
  sourceStepId: string;
  sourcePath: string;
  dependentStepIds: string[];
  transitiveDependentStepIds: string[];
  dependentFields: string[];
  severity: "info" | "warning";
}

export interface RiskSummary {
  incomingCount: number;
  outgoingCount: number;
  unresolvedCount: number;
  riskyCount: number;
}

export interface VariableAnalysisOutput {
  aliases: StepAlias[];
  references: VariableReference[];
  unresolved: VariableReference[];
  reverseDependencies: Record<string, string[]>;
  producers: VariableProducer[];
  edges: VariableReferenceEdge[];
  impacts: ImpactRecord[];
  byVariableRef: Record<string, string[]>;
  bySourceStep: Record<string, string[]>;
  byDependentStep: Record<string, string[]>;
  byUnresolvedState: Record<LineageResolutionStatus, string[]>;
  bySourcePath: Record<string, ImpactRecord>;
  consumersBySourceStep: Record<string, string[]>;
  producersByDependentStep: Record<string, string[]>;
  riskByStep: Record<string, RiskSummary>;
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
