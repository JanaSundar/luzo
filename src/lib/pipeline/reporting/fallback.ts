import type { AIReportConfig, NarrativeAiOutput, NarrativeReport } from "@/types/pipeline-debug";
import type { ReducedContext } from "@/types/pipeline-debug";
import { createNarrativeReport, toEndpointMetrics } from "./shared";

export function buildFallbackStructuredReport(
  context: ReducedContext,
  config: AIReportConfig,
  derivedTitle?: string
): NarrativeReport {
  return createNarrativeReport(context, config, buildFallbackOutput(context), derivedTitle);
}

function buildFallbackOutput(context: ReducedContext): NarrativeAiOutput {
  const endpointMetrics = toEndpointMetrics(context);
  const failedEndpoints = endpointMetrics.filter((endpoint) => endpoint.outcome === "error");
  const slowEndpoints = endpointMetrics.filter((endpoint) => (endpoint.latencyMs ?? 0) > 1000);

  return {
    summary:
      failedEndpoints.length > 0
        ? `The pipeline finished with ${failedEndpoints.length} request failure(s) and requires follow-up before the flow can be considered healthy.`
        : `The pipeline completed successfully with ${context.metadata.successRate}% request success and no transport failures.`,
    insights: [
      `${context.metadata.totalSteps} request(s) were executed in ${context.metadata.totalDurationMs}ms total.`,
      `Average latency was ${context.metadata.avgLatencyMs}ms with a p95 of ${context.metadata.p95LatencyMs}ms.`,
      slowEndpoints.length > 0
        ? `${slowEndpoints.length} request(s) exceeded the 1000ms latency threshold.`
        : "No request crossed the 1000ms latency threshold.",
    ],
    requests: endpointMetrics.map((endpoint) => ({
      name: endpoint.stepName,
      analysis:
        endpoint.outcome === "error"
          ? `${endpoint.stepName} returned ${endpoint.statusCode ?? "an error"} and should be inspected.`
          : endpoint.outcome === "warning"
            ? `${endpoint.stepName} succeeded but showed elevated latency (${endpoint.latencyMs ?? 0}ms).`
            : `${endpoint.stepName} completed successfully with stable transport metrics.`,
    })),
    risks:
      failedEndpoints.length > 0
        ? failedEndpoints.map(
            (endpoint) => `${endpoint.stepName} failed with status ${endpoint.statusCode ?? "N/A"}.`
          )
        : [
            "No immediate transport or stability risks were detected in the reduced execution data.",
          ],
    recommendations: [
      failedEndpoints.length > 0
        ? "Investigate the failing request path before relying on this pipeline in production."
        : "Use this run as a baseline and compare future executions against it.",
      slowEndpoints.length > 0
        ? "Review the slower requests for backend bottlenecks, dependency drift, or retries."
        : "Continue monitoring latency over time to catch regressions early.",
    ],
    conclusion:
      failedEndpoints.length > 0
        ? "This execution should be treated as degraded until the failing requests are resolved."
        : "This execution appears healthy based on the selected signals and reduced transport data.",
  };
}
