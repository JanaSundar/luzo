import type { AiProvider, HttpMethod } from ".";

// ---------------------------------------------------------------------------
// Step Snapshots (AI-ready)
// ---------------------------------------------------------------------------

export type StepStatus = "pending" | "running" | "success" | "error" | "aborted" | "skipped";

/** Type of execution entry within a pipeline step */
export type EntryType = "pre_request" | "request" | "test";

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
  /** Trimmed subset of the response body — never the full payload */
  summary: Record<string, unknown>;
  headers: Record<string, string>;
}

export interface StepSnapshot {
  stepId: string;
  stepName: string;
  /** The type of entry: pre_request, request, or test */
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
  /** Pre-request script result (only for entryType: "pre_request" or "request") */
  preRequestResult?: ScriptResult;
  /** Test script result (only for entryType: "test" or "request") */
  testResult?: ScriptResult;
  variables: Record<string, unknown>;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

// ---------------------------------------------------------------------------
// Pipeline Debug Runtime
// ---------------------------------------------------------------------------

export type DebugStatus = "idle" | "running" | "paused" | "completed" | "failed" | "aborted";

export interface DebugRuntimeState {
  status: DebugStatus;
  currentStepIndex: number;
  totalSteps: number;
  startedAt: string | null;
  completedAt: string | null;
}

// ---------------------------------------------------------------------------
// Context Variables & Signals
// ---------------------------------------------------------------------------

export type SensitivityLevel = "high" | "medium" | "low";

export interface ContextVariable {
  /** Fully qualified path: e.g. "req1.response.body.data.token" */
  path: string;
  /** The step this variable belongs to */
  stepId: string;
  /** Human-readable label */
  label: string;
  value: unknown;
  sensitivity: SensitivityLevel;
  /** Auto-selected for AI input by default */
  autoSelected: boolean;
}

export interface SignalGroup {
  stepId: string;
  stepName: string;
  method: HttpMethod;
  url: string;
  variables: ContextVariable[];
}

// ---------------------------------------------------------------------------
// Context Reduction (LLM-safe)
// ---------------------------------------------------------------------------

export interface ReducedSignal {
  key: string;
  label: string;
  value: string;
  stepId: string;
  priority: "critical" | "high" | "normal";
}

export interface ReducedContext {
  signals: ReducedSignal[];
  metadata: {
    totalSteps: number;
    failedSteps: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    totalDurationMs: number;
  };
  /** Estimated token count for the context */
  estimatedTokens: number;
}

// ---------------------------------------------------------------------------
// AI Provider Architecture
// ---------------------------------------------------------------------------

export interface AIProviderConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
  /** Advanced mode: custom base URL override */
  customBaseUrl?: string;
  /** Advanced mode: custom model ID override */
  customModel?: string;
}

export interface ModelMetadata {
  id: string;
  label: string;
  provider: AiProvider;
  contextWindow: number;
  speed: "fast" | "medium" | "slow";
  cost: "free" | "low" | "medium" | "high";
  quality: "basic" | "good" | "excellent";
  recommended?: boolean;
}

export interface ProviderRegistryEntry {
  id: AiProvider;
  name: string;
  models: ModelMetadata[];
  defaultModel: string;
}

// ---------------------------------------------------------------------------
// AI Report Generation
// ---------------------------------------------------------------------------

export type ReportMode = "preview" | "ai";

export interface AIReportConfig {
  tone: "technical" | "executive" | "compliance";
  prompt: string;
  selectedSignals: string[];
  mode: ReportMode;
}

export interface AIReportCache {
  /** Hash of pipeline result + config for cache matching */
  cacheKey: string;
  output: string;
  generatedAt: string;
  config: AIReportConfig;
}

export interface ReportState {
  config: AIReportConfig;
  cache: AIReportCache | null;
  isDirty: boolean;
  isGenerating: boolean;
  output: string | null;
  estimatedTokens: number;
}

// ---------------------------------------------------------------------------
// DAG Validation
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Progressive Validation
// ---------------------------------------------------------------------------

export interface VariableSuggestion {
  path: string;
  label: string;
  stepId: string;
  type: "body" | "header" | "status" | "meta" | "env";
}

// ---------------------------------------------------------------------------
// Generator Executor Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Abort control
// ---------------------------------------------------------------------------

export interface StepAbortControl {
  controller: AbortController;
  timeoutId?: ReturnType<typeof setTimeout>;
}

// ---------------------------------------------------------------------------
// Pipeline builder step with resolved alias
// ---------------------------------------------------------------------------

export interface StepAlias {
  stepId: string;
  alias: string;
  index: number;
}
