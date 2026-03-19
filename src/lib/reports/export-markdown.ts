import type { ExportReportModel } from "@/types/pipeline-debug";

export function buildReportMarkdown(model: ExportReportModel) {
  const sections = [
    `# ${model.title}`,
    "",
    `- Pipeline: ${model.pipelineName}`,
    `- Tone: ${capitalize(model.tone)}`,
    `- Generated: ${new Date(model.generatedAt).toLocaleString()}`,
    "",
    "## Execution Overview",
    `- Success rate: ${model.metrics.successRate}%`,
    `- Failed steps: ${model.metrics.failedSteps}`,
    `- Average latency: ${model.metrics.avgLatencyMs}ms`,
    `- P95 latency: ${model.metrics.p95LatencyMs}ms`,
    `- Total duration: ${model.metrics.totalDurationMs}ms`,
    "",
    "## Summary",
    model.summary,
    "",
    "## Health Summary",
    model.healthSummary,
    "",
    "## Per Request Breakdown",
    ...model.requests.flatMap((request) => [
      `### ${request.name}`,
      `- Method: ${request.method}`,
      `- URL: ${request.url}`,
      `- Status: ${request.statusCode ?? "N/A"}`,
      `- Latency: ${request.latencyMs ?? 0}ms`,
      request.analysis,
      "",
    ]),
    "## Insights",
    ...toBullets(model.insights),
    "",
    "## Risks",
    ...toBullets(model.risks),
    "",
    "## Recommendations",
    ...toBullets(model.recommendations),
    "",
    "## Conclusion",
    model.conclusion,
    "",
  ];

  return sections.join("\n");
}

function toBullets(items: string[]) {
  return (items.length > 0 ? items : ["No items available."]).map((item) => `- ${item}`);
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
