import type { HttpMethod } from ".";

export type StepStatus = "pending" | "running" | "success" | "error" | "aborted" | "skipped";
export type EntryType = "pre_request" | "request" | "test";
export type DebugStatus = "idle" | "running" | "paused" | "completed" | "failed" | "aborted";
export type PartialExecutionMode = "full" | "partial-previous" | "partial-fresh";
export type SensitivityLevel = "high" | "medium" | "low";

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
  stepName: string;
  entryType: EntryType;
  method: HttpMethod;
  url: string;
  resolvedRequest: {
    url: string;
    headers: Record<string, string>;
    body: string | null;
  };
  status: StepStatus;
  reducedResponse: ReducedResponse | null;
  fullBody?: string;
  fullHeaders?: Record<string, string>;
  preRequestResult?: ScriptResult;
  testResult?: ScriptResult;
  variables: Record<string, unknown>;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface DebugRuntimeState {
  status: DebugStatus;
  currentStepIndex: number;
  totalSteps: number;
  startedAt: string | null;
  completedAt: string | null;
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
}

export interface GeneratorYield {
  type: "step_ready" | "step_complete" | "pipeline_complete" | "error";
  snapshot: StepSnapshot;
  allSnapshots: StepSnapshot[];
}

export type PipelineGenerator = AsyncGenerator<GeneratorYield, void, void>;

export interface DebugControls {
  step: () => void;
  continue: () => void;
  stop: () => void;
}

export interface StepAbortControl {
  controller: AbortController;
  timeoutId?: ReturnType<typeof setTimeout>;
}

export interface StepAlias {
  stepId: string;
  alias: string;
  index: number;
}

export interface DebugSessionOptions {
  startStepId?: string;
  executionMode?: PartialExecutionMode;
  initialRuntimeVariables?: Record<string, unknown>;
  reusedAliases?: string[];
  staleContextWarning?: string | null;
}
