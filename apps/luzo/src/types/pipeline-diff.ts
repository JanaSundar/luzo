import type { CheckpointArtifact } from "@/features/pipeline/pipeline-persistence";
import type { PersistedExecutionArtifact } from "./pipeline-persistence";

export type RunDiffSeverity = "regression" | "changed" | "improved" | "unchanged";

export type StepRunDiffChangeKind =
  | "status"
  | "latency"
  | "response-shape"
  | "response-summary"
  | "tests"
  | "pre-request"
  | "post-request"
  | "step-added"
  | "step-missing";

export interface StepRunDiffChange {
  kind: StepRunDiffChangeKind;
  severity: Exclude<RunDiffSeverity, "unchanged">;
  message: string;
  before?: string | number | boolean | null;
  after?: string | number | boolean | null;
}

export interface StepRunDiff {
  stepId: string;
  baselineStepId: string | null;
  stepName: string;
  severity: RunDiffSeverity;
  isMatched: boolean;
  statusChanged: boolean;
  latencyDeltaMs: number | null;
  latencyDeltaPct: number | null;
  responseShapeChanged: boolean;
  responseSummaryChanged: boolean;
  testsChanged: boolean;
  preRequestChanged: boolean;
  postRequestChanged: boolean;
  changes: StepRunDiffChange[];
}

export interface PipelineRunDiffSummary {
  severity: RunDiffSeverity;
  changedSteps: number;
  regressions: number;
  improvements: number;
  unchangedSteps: number;
  missingSteps: number;
  newSteps: number;
  warnings: string[];
}

export interface PipelineRunDiff {
  baselineGeneratedAt: string;
  currentGeneratedAt: string;
  structureChanged: boolean;
  summary: PipelineRunDiffSummary;
  orderedStepIds: string[];
  stepsById: Record<string, StepRunDiff>;
}

export interface PinnedBaselineArtifact {
  pinnedAt: string;
  note: string | null;
  sourceGeneratedAt: string;
  artifact: PersistedExecutionArtifact | CheckpointArtifact;
}
