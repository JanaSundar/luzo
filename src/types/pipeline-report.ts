import type { AiProvider, HttpMethod, NarrativeTone } from ".";

export type ReportMode = "preview" | "ai";
export type ExportFormat = "pdf" | "json" | "markdown";

export interface AIProviderConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
  customBaseUrl?: string;
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

export interface AIReportConfig {
  tone: NarrativeTone;
  prompt: string;
  selectedSignals: string[];
  mode: ReportMode;
}

export interface ReportMetrics {
  totalSteps: number;
  failedSteps: number;
  successRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  totalDurationMs: number;
}

export interface ReportEndpointMetric {
  stepId: string;
  stepName: string;
  method: HttpMethod;
  url: string;
  statusCode: number | null;
  latencyMs: number | null;
  sizeBytes: number | null;
  error: string | null;
  outcome: "success" | "warning" | "error";
}

export interface NarrativeRequestReport {
  stepId: string;
  name: string;
  method: HttpMethod;
  url: string;
  analysis: string;
  statusCode: number | null;
  latencyMs: number | null;
}

export interface NarrativeAiOutput {
  summary: string;
  insights: string[];
  requests: Array<Pick<NarrativeRequestReport, "name" | "analysis">>;
  risks: string[];
  recommendations: string[];
  conclusion: string;
}

export interface NarrativeReport extends NarrativeAiOutput {
  tone: NarrativeTone;
  title: string;
  metrics: ReportMetrics;
  endpointMetrics: ReportEndpointMetric[];
  requests: NarrativeRequestReport[];
}

export type StructuredReport = NarrativeReport;

export interface AIReportCache {
  cacheKey: string;
  report: NarrativeReport;
  mode: ReportMode;
  generatedAt: string;
  config: AIReportConfig;
}

export interface ReportState {
  config: AIReportConfig;
  cache: AIReportCache | null;
  isDirty: boolean;
  isGenerating: boolean;
  report: NarrativeReport | null;
  estimatedTokens: number;
}

export interface ExportReportModel {
  title: string;
  tone: NarrativeTone;
  pipelineName: string;
  generatedAt: string;
  summary: string;
  healthSummary: string;
  metrics: ReportMetrics;
  requests: NarrativeRequestReport[];
  insights: string[];
  risks: string[];
  recommendations: string[];
  conclusion: string;
}
