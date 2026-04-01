import type { HttpMethod } from ".";
import type { TimelineEvent } from "./timeline-event";
import type { ExpandedNodeOrigin } from "./workflow";

export type StepStatus = "idle" | "step_ready" | "running" | "success" | "error" | "done";

export type StreamStatus = "idle" | "streaming" | "done" | "error";

export type EntryType = "pre_request" | "request" | "post_request" | "test";

export type DebugStatus =
  | "idle"
  | "running"
  | "paused"
  | "error"
  | "completed"
  | "aborted"
  | "interrupted";

export type PartialExecutionMode = "full" | "partial-previous" | "partial-fresh";

export type SensitivityLevel = "high" | "medium" | "low";

export type ExecutionMode = "auto" | "debug";

export interface ScriptResult {
  status: StepStatus;
  logs: string[];
  error: string | null;
  durationMs: number;
  testResults?: Array<{ name: string; passed: boolean; error?: string }>;
}

export interface ReducedResponse {
  status: number;
  statusText: string;
  latencyMs: number;
  sizeBytes: number;
  summary: Record<string, unknown>;
  headers: Record<string, string>;
}

export interface StepSnapshot {
  stepId: string;
  stepIndex: number;
  stepName: string;
  entryType: EntryType;
  method: HttpMethod;
  url: string;
  resolvedRequest: {
    method: HttpMethod;
    url: string;
    headers: Record<string, string>;
    body: string | null;
  };
  status: StepStatus;
  reducedResponse: ReducedResponse | null;
  fullBody?: string;
  fullHeaders?: Record<string, string>;
  preRequestResult?: ScriptResult;
  postRequestResult?: ScriptResult;
  testResult?: ScriptResult;
  variables: Record<string, unknown>;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
  streamStatus: StreamStatus;
  streamChunks: string[];
  highlightPath?: string;
  subflowSource?: ExpandedNodeOrigin;
  timelineEvents?: TimelineEvent[];
  conditionResult?: { result: boolean; resolvedInputs: Record<string, unknown> };
}

export interface DebugRuntimeState {
  status: DebugStatus;
  currentStepIndex: number;
  totalSteps: number;
  startedAt: number | null;
  completedAt: number | null;
  mode: PartialExecutionMode;
  startStepId: string | null;
  reusedAliases: string[];
  staleContextWarning: string | null;
}

export interface ContextVariable {
  path: string;
  stepId: string;
  label: string;
  value: unknown;
  sensitivity: SensitivityLevel;
  autoSelected: boolean;
}

export interface SignalGroup {
  stepId: string;
  stepName: string;
  method: HttpMethod;
  url: string;
  variables: ContextVariable[];
}

export interface ReducedSignal {
  key: string;
  label: string;
  value: string;
  stepId: string;
  priority: "critical" | "high" | "normal";
}

export interface ReducedStepContext {
  stepId: string;
  stepName: string;
  method: HttpMethod;
  url: string;
  status: StepStatus;
  statusCode: number | null;
  latencyMs: number | null;
  sizeBytes: number | null;
  requestHeaders: Record<string, string>;
  headers: Record<string, string>;
  responseSummary: Record<string, unknown>;
  error: string | null;
  selectedSignals: ReducedSignal[];
}

export interface ReducedContext {
  signals: ReducedSignal[];
  steps: ReducedStepContext[];
  metadata: {
    totalSteps: number;
    failedSteps: number;
    successRate: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    totalDurationMs: number;
  };
  estimatedTokens: number;
}

export interface ValidationError {
  stepId: string;
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface VariableSuggestion {
  path: string;
  label: string;
  stepId: string;
  type: "body" | "header" | "status" | "meta" | "env";
  resolvedValue?: string;
  displayValue?: string;
  isSensitive?: boolean;
}

export type GeneratorYield =
  | { type: "execution_started"; totalSteps: number; startedAt: number }
  | { type: "step_ready"; snapshot: StepSnapshot }
  | { type: "step_stream_chunk"; snapshot: StepSnapshot; chunk: string }
  | {
      type: "timeline_event";
      event: TimelineEvent;
      snapshot?: StepSnapshot;
      runtimeVariables?: Record<string, unknown>;
    }
  | { type: "step_completed"; snapshot: StepSnapshot; runtimeVariables: Record<string, unknown> }
  | { type: "step_failed"; snapshot: StepSnapshot; runtimeVariables: Record<string, unknown> }
  | {
      type: "condition_evaluated";
      snapshot: StepSnapshot;
      result: boolean;
      runtimeVariables: Record<string, unknown>;
    }
  | { type: "execution_completed"; completedAt: number }
  | { type: "execution_interrupted"; completedAt: number; reason: string };

export type PipelineExecutionEvent = GeneratorYield;

export type PipelineRuntime = AsyncGenerator<
  PipelineExecutionEvent,
  void,
  Record<string, string> | undefined
>;

export type PipelineGenerator = PipelineRuntime;

export interface StepAbortControl {
  controller: AbortController;
  timeoutId?: ReturnType<typeof setTimeout>;
}

export interface StepAlias {
  stepId: string;
  alias: string;
  index: number;
  refs: string[];
}

export interface DebugSessionOptions {
  startStepId?: string;
  partialMode?: PartialExecutionMode;
  executionMode?: ExecutionMode;
  initialRuntimeVariables?: Record<string, unknown>;
  reusedAliases?: string[];
  staleContextWarning?: string | null;
}

export interface ControllerSnapshot {
  executionId: string | null;
  state: DebugStatus;
  originExecutionMode: ExecutionMode;
  currentStepIndex: number;
  totalSteps: number;
  snapshots: StepSnapshot[];
  runtimeVariables: Record<string, unknown>;
  variableOverrides: Record<string, string>;
  errorMessage: string | null;
  startedAt: number | null;
  completedAt: number | null;
}

export interface ControllerOptions {
  stepTimeoutMs?: number;
  executionMode?: ExecutionMode;
  startStepId?: string;
  initialRuntimeVariables?: Record<string, unknown>;
  reusedAliases?: string[];
  staleContextWarning?: string | null;
  abortSignal?: AbortSignal;
}
