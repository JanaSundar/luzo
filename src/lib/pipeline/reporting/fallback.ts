import type {
  AIReportConfig,
  NarrativeAiOutput,
  NarrativeReport,
  ReducedContext,
} from "@/types/pipeline-debug";
import { buildHealthSummary, toEndpointMetrics } from "./shared";

export function buildFallbackStructuredReport(
  context: ReducedContext,
  config: AIReportConfig,
  derivedTitle?: string,
): NarrativeReport {
  const endpointMetrics = toEndpointMetrics(context);
  const failedEndpoints = endpointMetrics.filter((e) => e.outcome === "error");
  const warningEndpoints = endpointMetrics.filter((e) => e.outcome === "warning");
  const slowEndpoints = endpointMetrics.filter((e) => (e.latencyMs ?? 0) > 1000);
  const verySlowEndpoints = endpointMetrics.filter((e) => (e.latencyMs ?? 0) > 3000);

  const title =
    derivedTitle || `${config.tone.charAt(0).toUpperCase()}${config.tone.slice(1)} Pipeline Report`;

  const baseInsights: string[] = [
    `${context.metadata.totalSteps} request(s) executed in ${context.metadata.totalDurationMs}ms total duration.`,
    `Success rate: ${context.metadata.successRate}% (${context.metadata.totalSteps - context.metadata.failedSteps}/${context.metadata.totalSteps} succeeded).`,
    `Average latency: ${context.metadata.avgLatencyMs}ms. P95 latency: ${context.metadata.p95LatencyMs}ms.`,
  ];

  if (slowEndpoints.length > 0) {
    const slowest = [...slowEndpoints].sort((a, b) => (b.latencyMs ?? 0) - (a.latencyMs ?? 0))[0];
    baseInsights.push(
      `${slowEndpoints.length} request(s) exceeded 1000ms. Slowest: ${slowest.stepName} at ${slowest.latencyMs}ms.`,
    );
  }

  if (failedEndpoints.length > 0) {
    baseInsights.push(
      `Failed endpoints: ${failedEndpoints.map((e) => `${e.stepName} (${e.statusCode ?? "N/A"})`).join(", ")}.`,
    );
  }

  const baseRisks: string[] = [];
  if (failedEndpoints.length > 0) {
    baseRisks.push(
      ...failedEndpoints.map(
        (e) =>
          `${e.stepName} returned HTTP ${e.statusCode ?? "error"} — pipeline health is compromised.`,
      ),
    );
  }
  if (verySlowEndpoints.length > 0) {
    baseRisks.push(
      `${verySlowEndpoints.length} request(s) exceeded 3000ms — potential backend bottleneck or network issue.`,
    );
  }
  if (failedEndpoints.length === 0 && verySlowEndpoints.length === 0) {
    baseRisks.push("No critical transport risks detected in this execution.");
  }

  const baseRecommendations: string[] = [];
  if (failedEndpoints.length > 0) {
    baseRecommendations.push(
      `Investigate and resolve failures in: ${failedEndpoints.map((e) => e.stepName).join(", ")} before treating this pipeline as healthy.`,
    );
    baseRecommendations.push(
      "Check server logs for each failed endpoint to identify root cause (4xx client errors, 5xx server errors, timeouts).",
    );
  }
  if (slowEndpoints.length > 0) {
    baseRecommendations.push(
      "Review high-latency requests for optimization opportunities: query parameter tuning, pagination, caching, or async processing.",
    );
  }
  if (failedEndpoints.length === 0 && slowEndpoints.length > 0) {
    baseRecommendations.push(
      "Establish latency baselines and set up alerts for p95 > 1000ms to catch regressions early.",
    );
  }
  if (failedEndpoints.length === 0 && slowEndpoints.length === 0) {
    baseRecommendations.push(
      "Use this execution as a performance baseline for future regression comparisons.",
    );
    baseRecommendations.push(
      "Monitor latency trends over time to detect gradual performance degradation.",
    );
  }
  baseRecommendations.push(
    "Enable request-level logging to correlate errors with specific request traces.",
  );
  baseRecommendations.push(
    "Consider adding retry logic with exponential backoff for transient failures.",
  );
  baseRecommendations.push(
    "Document timeout configurations and ensure they align with backend SLA expectations.",
  );

  const output: NarrativeAiOutput = {
    summary:
      failedEndpoints.length > 0
        ? `Pipeline execution completed with ${failedEndpoints.length} failure(s). ${warningEndpoints.length} request(s) showed elevated latency. Success rate: ${context.metadata.successRate}%. Average latency: ${context.metadata.avgLatencyMs}ms, P95: ${context.metadata.p95LatencyMs}ms.`
        : warningEndpoints.length > 0
          ? `Pipeline executed successfully with ${context.metadata.successRate}% success rate. ${warningEndpoints.length} request(s) showed elevated latency (>1000ms). Average: ${context.metadata.avgLatencyMs}ms, P95: ${context.metadata.p95LatencyMs}ms.`
          : `Pipeline completed successfully. ${context.metadata.successRate}% success rate across ${context.metadata.totalSteps} steps. Average latency: ${context.metadata.avgLatencyMs}ms, P95: ${context.metadata.p95LatencyMs}ms.`,
    insights: baseInsights,
    requests: endpointMetrics.map((endpoint) => ({
      name: endpoint.stepName,
      analysis:
        endpoint.outcome === "error"
          ? `${endpoint.stepName} (${endpoint.method} ${endpoint.url}) returned ${endpoint.statusCode ?? "an error"} in ${endpoint.latencyMs ?? 0}ms. ${endpoint.error ? `Error: ${endpoint.error}` : "Status code indicates failure."}`
          : endpoint.outcome === "warning"
            ? `${endpoint.stepName} succeeded (${endpoint.statusCode}) but latency was elevated at ${endpoint.latencyMs ?? 0}ms — exceeds 1000ms threshold.`
            : `${endpoint.stepName} completed successfully (${endpoint.statusCode}) in ${endpoint.latencyMs ?? 0}ms with ${endpoint.sizeBytes ?? 0} bytes.`,
    })),
    risks: baseRisks,
    recommendations: baseRecommendations,
    conclusion:
      failedEndpoints.length > 0
        ? "This execution is degraded. Resolve all failed endpoints before deploying this pipeline to production. Latency should also be reviewed for the affected steps."
        : warningEndpoints.length > 0
          ? "Execution succeeded but performance warrants attention. High-latency endpoints should be profiled and optimized to maintain SLA compliance."
          : "This execution completed successfully with acceptable performance characteristics. No immediate action required beyond baseline monitoring.",
  };

  return createFallbackNarrativeReport(context, config, output, title);
}

function createFallbackNarrativeReport(
  context: ReducedContext,
  config: AIReportConfig,
  output: NarrativeAiOutput,
  title: string,
): NarrativeReport {
  const endpointMetrics = toEndpointMetrics(context);
  const baseReport: NarrativeReport = {
    tone: config.tone,
    title,
    healthSummary: "",
    metrics: {
      totalSteps: context.metadata.totalSteps,
      failedSteps: context.metadata.failedSteps,
      successRate: context.metadata.successRate,
      avgLatencyMs: context.metadata.avgLatencyMs,
      p95LatencyMs: context.metadata.p95LatencyMs,
      totalDurationMs: context.metadata.totalDurationMs,
    },
    endpointMetrics,
    summary: output.summary,
    insights: uniqueItems(output.insights),
    risks: uniqueItems(output.risks),
    recommendations: uniqueItems(output.recommendations),
    conclusion: output.conclusion,
    requests: endpointMetrics.map((endpoint, index) => ({
      stepId: endpoint.stepId,
      name: endpoint.stepName,
      method: endpoint.method,
      url: endpoint.url,
      statusCode: endpoint.statusCode,
      latencyMs: endpoint.latencyMs,
      analysis: output.requests[index]?.analysis ?? `${endpoint.stepName} processed.`,
    })),
  };

  return {
    ...baseReport,
    healthSummary: buildHealthSummary(baseReport),
  };
}

function uniqueItems(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}
