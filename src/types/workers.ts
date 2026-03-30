import type { BuildTimelineIndexInput } from "@/features/timeline/buildTimelineIndex";
import type { ReplayStateAtInput } from "@/features/timeline/deriveReplayStateAt";
import type { GraphFocusInput, GraphFocusOutput } from "@/features/workflow/analysis/graph-focus";
import type {
  JsonDiffInput,
  JsonDiffOutput,
  LargePayloadTransformInput,
  LargePayloadTransformOutput,
} from "@/features/workflow/json/json-transforms";
import type {
  ParseImportSourceInput,
  ParseImportSourceOutput,
} from "@/features/workflow/import/parseImportSource";
import type { Pipeline } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import type {
  CompilePlanInput,
  CompilePlanOutput,
  DagValidationResult,
  Result,
  TimelineFilterInput,
  TimelineFilterOutput,
  ValidateDagInput,
  VariableAnalysisOutput,
  BuildWorkflowInput,
  BuildVariableSuggestionsInput,
  RebuildRuntimeVariablesInput,
} from "./worker-results";
import type { FlowDocument, WorkflowBundle } from "./workflow";

export interface SyncTimelineWorkerInput {
  snapshots: import("./pipeline-runtime").StepSnapshot[];
  executionId: string;
  pipeline: Pipeline;
}

export interface GraphWorkerApi {
  normalizeFlowDocument(input: { flow: FlowDocument }): Promise<Result<FlowDocument>>;
  buildWorkflowDefinition(input: BuildWorkflowInput): Promise<Result<WorkflowBundle>>;
  validateWorkflowDag(input: ValidateDagInput): Promise<Result<DagValidationResult>>;
  compileExecutionPlan(input: CompilePlanInput): Promise<Result<CompilePlanOutput>>;
  computeGraphFocus(input: GraphFocusInput): Promise<Result<GraphFocusOutput>>;
}

export interface AnalysisWorkerApi {
  analyzeVariables(input: CompilePlanInput): Promise<Result<VariableAnalysisOutput>>;
  buildVariableSuggestions(
    input: BuildVariableSuggestionsInput,
  ): Promise<Result<VariableSuggestion[]>>;
  rebuildRuntimeVariables(
    input: RebuildRuntimeVariablesInput,
  ): Promise<Result<Record<string, unknown>>>;
}

export interface TimelineWorkerApi {
  buildTimelineIndex(
    input: BuildTimelineIndexInput,
  ): Promise<Result<import("./workflow").TimelineIndex>>;
  filterTimeline(input: TimelineFilterInput): Promise<Result<TimelineFilterOutput>>;
  deriveReplayStateAt(
    input: ReplayStateAtInput,
  ): Promise<Result<import("./worker-results").ReplayStateAtOutput>>;
  syncTimeline(input: SyncTimelineWorkerInput): Promise<Result<import("./workflow").TimelineIndex>>;
}

export interface ImportWorkerApi {
  parseImportSource(input: ParseImportSourceInput): Promise<Result<ParseImportSourceOutput>>;
}

export interface JsonWorkerApi {
  diffJsonPayloads(input: JsonDiffInput): Promise<Result<JsonDiffOutput>>;
  transformLargePayload(
    input: LargePayloadTransformInput,
  ): Promise<Result<LargePayloadTransformOutput>>;
  tryBuildJsonDocument(input: {
    text: string;
  }): Promise<Result<import("@/features/json-view/buildJsonDocument").JsonDocumentModel | null>>;
}
