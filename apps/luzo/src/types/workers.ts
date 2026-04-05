import type { JsonDocumentModel } from "@/lib/json-view/buildJsonDocument";
import type { Pipeline } from "@/types";
import type { StepSnapshot } from "@/types/pipeline-runtime";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import type {
  AnalyzeVariablesInput,
  BuildVariableSuggestionsInput,
  BuildWorkflowInput,
  CompilePlanInput,
  CompilePlanOutput,
  DagValidationResult,
  RebuildRuntimeVariablesInput,
  ReplayStateAtOutput,
  Result,
  TimelineFilterInput,
  TimelineFilterOutput,
  ValidateDagInput,
  VariableAnalysisOutput,
} from "./worker-results";
import type { FlowDocument, TimelineIndex, WorkflowBundle } from "./workflow";

export interface SyncTimelineWorkerInput {
  snapshots: StepSnapshot[];
  executionId: string;
  pipeline: Pipeline;
}

export interface BuildTimelineIndexInput extends SyncTimelineWorkerInput {}

export interface ReplayStateAtInput {
  index: TimelineIndex;
  timestamp: number;
}

export interface GraphFocusInput {
  workflow: WorkflowBundle["workflow"];
  focusNodeId: string;
}

export interface GraphFocusOutput {
  highlightedNodeIds: string[];
  highlightedEdgeIds: string[];
}

export interface JsonDiffInput {
  left: string;
  right: string;
}

export interface JsonDiffOutput {
  changed: boolean;
  summary: string;
}

export interface LargePayloadTransformInput {
  text: string;
  maxLength: number;
}

export interface LargePayloadTransformOutput {
  text: string;
  truncated: boolean;
}

export interface ParseImportSourceInput {
  source: string;
  format?: string;
}

export interface ParseImportSourceOutput {
  [key: string]: unknown;
}

export interface GraphWorkerApi {
  normalizeFlowDocument(input: { flow: FlowDocument }): Promise<Result<FlowDocument>>;
  buildWorkflowDefinition(input: BuildWorkflowInput): Promise<Result<WorkflowBundle>>;
  validateWorkflowDag(input: ValidateDagInput): Promise<Result<DagValidationResult>>;
  compileExecutionPlan(input: CompilePlanInput): Promise<Result<CompilePlanOutput>>;
  computeGraphFocus(input: GraphFocusInput): Promise<Result<GraphFocusOutput>>;
}

export interface AnalysisWorkerApi {
  analyzeVariables(input: AnalyzeVariablesInput): Promise<Result<VariableAnalysisOutput>>;
  buildVariableSuggestions(
    input: BuildVariableSuggestionsInput,
  ): Promise<Result<VariableSuggestion[]>>;
  rebuildRuntimeVariables(
    input: RebuildRuntimeVariablesInput,
  ): Promise<Result<Record<string, unknown>>>;
}

export interface TimelineWorkerApi {
  buildTimelineIndex(input: BuildTimelineIndexInput): Promise<Result<TimelineIndex>>;
  filterTimeline(input: TimelineFilterInput): Promise<Result<TimelineFilterOutput>>;
  deriveReplayStateAt(input: ReplayStateAtInput): Promise<Result<ReplayStateAtOutput>>;
  syncTimeline(input: SyncTimelineWorkerInput): Promise<Result<TimelineIndex>>;
}

export interface ImportWorkerApi {
  parseImportSource(input: ParseImportSourceInput): Promise<Result<ParseImportSourceOutput>>;
}

export interface JsonWorkerApi {
  diffJsonPayloads(input: JsonDiffInput): Promise<Result<JsonDiffOutput>>;
  transformLargePayload(
    input: LargePayloadTransformInput,
  ): Promise<Result<LargePayloadTransformOutput>>;
  tryBuildJsonDocument(input: { text: string }): Promise<Result<JsonDocumentModel | null>>;
}
