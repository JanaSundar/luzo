import type { HttpMethod, PipelineExecutionResult } from ".";
import type { AIReportCache } from "./pipeline-report";
import type { DebugRuntimeState, ReducedResponse, StepStatus } from "./pipeline-runtime";

export interface PersistedResolvedRequestSummary {
  url: string;
  headers: Record<string, string>;
  bodyPreview: string | null;
}

export interface PersistedStepArtifact {
  stepId: string;
  alias: string;
  stepName: string;
  method: HttpMethod;
  url: string;
  status: StepStatus;
  reducedResponse: ReducedResponse | null;
  resolvedRequestSummary: PersistedResolvedRequestSummary;
  error: string | null;
  completedAt: string | null;
}

export interface PersistedStepContext {
  stepId: string;
  alias: string;
  payload: Record<string, unknown>;
}

export interface PersistedExecutionArtifact {
  pipelineId: string;
  generatedAt: string;
  pipelineStructureHash: string;
  runtime: Pick<
    DebugRuntimeState,
    "mode" | "startStepId" | "reusedAliases" | "staleContextWarning" | "completedAt"
  >;
  steps: PersistedStepArtifact[];
  stepContextByAlias: Record<string, PersistedStepContext>;
  warnings: string[];
}

export interface PersistedDebuggerArtifact {
  pipelineId: string;
  selectedStepIndex: number;
  panelTab: "response" | "pre-request" | "tests";
}

export interface PersistedPipelineArtifacts {
  executionByPipelineId: Record<string, PersistedExecutionArtifact>;
  reportsByPipelineId: Record<string, PersistedReportArtifact>;
  debuggerByPipelineId: Record<string, PersistedDebuggerArtifact>;
}

export interface HydratedExecutionState {
  executionArtifact: PersistedExecutionArtifact | null;
  executionResult: PipelineExecutionResult | null;
}

export type PersistedReportArtifact = AIReportCache;
