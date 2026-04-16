import type { ApiRequest, PipelineStep } from ".";
import type { ValidationError } from "./pipeline-runtime";

export type GenerationSourceType =
  | "stored_collection"
  | "postman_json"
  | "luzo_json"
  | "prompt"
  | "builtin_template"
  | "saved_template"
  | "curl";
export type DependencyConfidence = "explicit" | "high" | "low";
export type PreviewGrouping = "sequential" | "parallel";

export interface GenerationSourceMetadata {
  label: string;
  collectionId?: string;
  collectionName?: string;
  fileName?: string;
  promptSummary?: string;
  sourceType: GenerationSourceType;
  templateId?: string;
  templateName?: string;
  templateSourceType?: "builtin" | "user";
  requestCountHint?: number;
}

export interface NormalizedCollectionRequest {
  folderPath: string[];
  request: ApiRequest;
  sourceName: string;
  sourceRequestId: string;
  warnings: string[];
}

export interface NormalizedCollectionInput {
  requests: NormalizedCollectionRequest[];
  source: GenerationSourceMetadata;
  warnings: string[];
}

export interface InferredDependency {
  applied: boolean;
  confidence: DependencyConfidence;
  fromStepId: string;
  id: string;
  ignored?: boolean;
  reason: string;
  toStepId: string;
  variable?: string;
}

export interface UnresolvedVariable {
  candidates: string[];
  field: string;
  message: string;
  stepId: string;
  variable: string;
}

export interface GenerationExplanation {
  detail: string;
  stepId: string;
  tone: "info" | "warning";
}

export interface PipelineGenerationStepDraft {
  explanations: string[];
  generatedName: string;
  grouping: PreviewGrouping;
  id: string;
  originalRequest: ApiRequest;
  request: ApiRequest;
  sourceName: string;
  sourceRequestId: string;
  unresolved: UnresolvedVariable[];
  warnings: string[];
}

export interface DraftValidationSummary {
  adjacency: Record<string, string[]>;
  errors: ValidationError[];
  sortedStepIds: string[];
  valid: boolean;
}

export interface PipelineGenerationDraft {
  dependencies: InferredDependency[];
  explanations: GenerationExplanation[];
  source: GenerationSourceMetadata;
  steps: PipelineGenerationStepDraft[];
  validation: DraftValidationSummary;
  warnings: string[];
}

export interface PipelineGenerationMetadata {
  generatedAt: string;
  source: GenerationSourceMetadata;
  stepMappings: Array<{
    grouping?: PreviewGrouping;
    sourceRequestId: string;
    stageIndex?: number;
    stepId: string;
  }>;
  summary: {
    dependencyCount: number;
    unresolvedCount: number;
    warningCount: number;
  };
}

export interface DraftValidationResult {
  steps: PipelineGenerationStepDraft[];
  validation: DraftValidationSummary;
}

export interface DraftPipelineStep extends PipelineStep {
  sourceRequestId: string;
}
