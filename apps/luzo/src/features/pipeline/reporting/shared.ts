import type { NarrativeTone } from "@/types";
import type {
  AIReportCache,
  AIReportConfig,
  NarrativeAiOutput,
  NarrativeReport,
  ReducedContext,
  ReportEndpointMetric,
  ReportMetrics,
} from "@/types/pipeline-debug";

export function toReportMetrics(context: ReducedContext): ReportMetrics {
  return {
    totalSteps: context.metadata.totalSteps,
    failedSteps: context.metadata.failedSteps,
    successRate: context.metadata.successRate,
    avgLatencyMs: context.metadata.avgLatencyMs,
    p95LatencyMs: context.metadata.p95LatencyMs,
    totalDurationMs: context.metadata.totalDurationMs,
  };
}

export function toEndpointMetrics(context: ReducedContext): ReportEndpointMetric[] {
  return context.steps.map((step) => ({
    stepId: step.stepId,
    stepName: step.stepName,
    method: step.method,
    url: step.url,
    statusCode: step.statusCode,
    latencyMs: step.latencyMs,
    sizeBytes: step.sizeBytes,
    error: step.error,
    outcome:
      step.error || step.statusCode == null || step.statusCode >= 400
        ? "error"
        : (step.latencyMs ?? 0) > 1000
          ? "warning"
          : "success",
  }));
}

export function createNarrativeReport(
  context: ReducedContext,
  config: AIReportConfig,
  output: NarrativeAiOutput,
  derivedTitle?: string,
): NarrativeReport {
  const endpointMetrics = toEndpointMetrics(context);
  const title = buildTitle(config.tone, derivedTitle);
  const metrics = toReportMetrics(context);
  const requests = endpointMetrics.map((endpoint, index) => ({
    stepId: endpoint.stepId,
    name: endpoint.stepName,
    method: endpoint.method,
    url: endpoint.url,
    statusCode: endpoint.statusCode,
    latencyMs: endpoint.latencyMs,
    analysis:
      output.requests[index]?.analysis ??
      fallbackRequestAnalysis(endpoint.stepName, endpoint.statusCode, endpoint.latencyMs),
  }));
  const baseReport: NarrativeReport = {
    tone: config.tone,
    title,
    healthSummary: "",
    metrics,
    endpointMetrics,
    summary: output.summary,
    insights: uniqueItems(output.insights),
    risks: uniqueItems(output.risks),
    recommendations: uniqueItems(output.recommendations),
    conclusion: output.conclusion,
    requests,
  };

  return {
    ...baseReport,
    healthSummary: buildHealthSummary(baseReport),
  };
}

export function buildHealthSummary(report: NarrativeReport) {
  const { metrics } = report;
  if (!metrics) {
    return "Health summary unavailable.";
  }
  if (metrics.failedSteps > 0) {
    return `The run finished with ${metrics.failedSteps} failed step(s). Investigate the affected requests before treating this pipeline as healthy.`;
  }
  if (metrics.p95LatencyMs > 1000) {
    return `The run completed successfully, but tail latency reached ${metrics.p95LatencyMs}ms, which suggests a performance hotspot.`;
  }
  return `The run completed successfully with a ${metrics.successRate}% success rate and stable response times across the pipeline.`;
}

export function createReportCacheKey(context: ReducedContext, config: AIReportConfig): string {
  const base = JSON.stringify({
    tone: config.tone,
    length: config.length,
    prompt: config.prompt.trim(),
    selectedSignals: [...config.selectedSignals].sort(),
    metadata: context.metadata,
    steps: context.steps.map((step) => ({
      stepId: step.stepId,
      statusCode: step.statusCode,
      latencyMs: step.latencyMs,
      error: step.error,
      selectedSignals: step.selectedSignals.map((signal) => [signal.key, signal.value]),
    })),
  });

  let hash = 5381;
  for (let index = 0; index < base.length; index++) {
    hash = (hash * 33) ^ base.charCodeAt(index);
  }
  return `report_${(hash >>> 0).toString(16)}`;
}

export function createReportCache(
  cacheKey: string,
  config: AIReportConfig,
  report: NarrativeReport,
  mode: "preview" | "ai",
): AIReportCache {
  return {
    cacheKey,
    report,
    mode,
    generatedAt: new Date().toISOString(),
    config: { ...config, selectedSignals: [...config.selectedSignals] },
  };
}

function buildTitle(tone: NarrativeTone, derivedTitle?: string) {
  if (derivedTitle) return derivedTitle;
  return `${tone.charAt(0).toUpperCase()}${tone.slice(1)} Pipeline Report`;
}

function uniqueItems(items: string[]) {
  return [...new Set(items.filter(Boolean))].slice(0, 6);
}

function fallbackRequestAnalysis(
  name: string,
  statusCode: number | null,
  latencyMs: number | null,
) {
  if (statusCode != null && statusCode >= 400) {
    return `${name} returned an error response (${statusCode}) and needs follow-up.`;
  }
  if ((latencyMs ?? 0) > 1000) {
    return `${name} succeeded but showed elevated latency at ${latencyMs}ms.`;
  }
  return `${name} completed successfully with no major transport issues observed.`;
}
