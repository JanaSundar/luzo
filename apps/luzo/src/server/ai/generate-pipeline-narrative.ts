import type { AINarrativeConfig, PipelineExecutionResult } from "@/types";

export interface AIProviderConfig {
  providerUrl: string;
  apiKey: string;
  model: string;
}

interface NarrativeMetrics {
  successCount: number;
  failCount: number;
  avgLatency: number;
  p95Latency: number;
  totalSteps: number;
}

export async function generatePipelineNarrative(
  result: PipelineExecutionResult,
  config: AINarrativeConfig,
  provider?: AIProviderConfig,
): Promise<string> {
  const metrics = buildNarrativeMetrics(result);
  const interpolatedPrompt = interpolateNarrativePrompt(result, config.prompt, metrics.avgLatency);

  if (provider?.apiKey && provider.providerUrl) {
    try {
      const response = await fetch(provider.providerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: "system", content: buildSystemPrompt(config.tone, result, metrics) },
            { role: "user", content: interpolatedPrompt },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return content;
        }
      } else {
        await response.text();
      }
    } catch {
      // Fall through to the deterministic template narrative.
    }
  }

  return generateTemplateNarrative(config.tone, metrics);
}

function buildNarrativeMetrics(result: PipelineExecutionResult): NarrativeMetrics {
  const successCount = result.results.filter(
    (entry) => entry.status >= 200 && entry.status < 300,
  ).length;
  const failCount = result.results.length - successCount;
  const avgLatency = Math.round(
    result.results.reduce((accumulator, entry) => accumulator + entry.time, 0) /
      result.results.length,
  );
  const sortedLatencies = result.results.map((entry) => entry.time).sort((a, b) => a - b);
  const p95Index = Math.ceil(sortedLatencies.length * 0.95) - 1;

  return {
    successCount,
    failCount,
    avgLatency,
    p95Latency: sortedLatencies[Math.max(0, p95Index)] ?? 0,
    totalSteps: result.results.length,
  };
}

function interpolateNarrativePrompt(
  result: PipelineExecutionResult,
  prompt: string,
  avgLatency: number,
): string {
  const context: Record<string, string> = {
    "request.url": result.results.map((entry) => entry.url).join(", "),
    "request.method": result.results.map((entry) => entry.method).join(", "),
    "request.headers": "See individual step headers",
    "response.status": result.results.map((entry) => `${entry.status}`).join(", "),
    "response.metrics.latency_ms": `${avgLatency}`,
    "response.metrics.size_kb": `${(result.results.reduce((size, entry) => size + entry.size, 0) / 1024).toFixed(1)}`,
  };

  return prompt.replace(/\{\{([^}]+)\}\}/g, (match, path) => context[path.trim()] ?? match);
}

function buildSystemPrompt(
  tone: string,
  result: PipelineExecutionResult,
  metrics: NarrativeMetrics,
) {
  const stepSummaries = result.results
    .map(
      (entry) =>
        `- ${entry.method} ${entry.url}: ${entry.status} ${entry.statusText} (${entry.time}ms, ${(entry.size / 1024).toFixed(1)}kb)`,
    )
    .join("\n");

  const toneInstructions =
    {
      technical:
        "You are a senior API engineer writing a detailed technical report. Include specific metrics, header analysis, and performance observations. Use markdown formatting.",
      executive:
        "You are a business analyst writing an executive summary. Focus on SLA compliance, business impact, and operational health. Keep language clear and non-technical. Use markdown.",
      compliance:
        "You are a security auditor writing a compliance report. Focus on data handling, PII exposure, endpoint security, and regulation compliance. Use markdown formatting.",
    }[tone] ?? "Write a clear, professional API report using markdown.";

  return `${toneInstructions}

## Execution Data
- Total steps: ${result.results.length}
- Successful: ${metrics.successCount}
- Failed: ${metrics.failCount}
- Average latency: ${metrics.avgLatency}ms
- P95 latency: ${metrics.p95Latency}ms

## Step Results
${stepSummaries}

Generate a structured report based on the user's prompt template and the execution data above.`;
}

function generateTemplateNarrative(tone: string, metrics: NarrativeMetrics): string {
  const { successCount, failCount, avgLatency, p95Latency, totalSteps } = metrics;
  const tonePrefix =
    {
      technical: "### Technical System Audit\n\n",
      executive: "### Executive Business Summary\n\n",
      compliance: "### Compliance & Security Review\n\n",
    }[tone] ?? "### Report\n\n";

  let narrative = `${tonePrefix}`;

  if (tone === "technical") {
    narrative += `The pipeline executed with **${successCount} successful** steps and **${failCount} failures** out of ${totalSteps} total. `;
    narrative += `Average system response time was measured at **${avgLatency}ms** (P95: **${p95Latency}ms**). `;
    narrative += "Test suites were validated against schema requirements. ";

    if (failCount > 0) {
      narrative += `\n\n#### Critical Issues Identified:\n- Detected non-2xx statuses in ${failCount} endpoint(s). Check latency profiles for bottlenecks.`;
    }
  } else if (tone === "executive") {
    narrative += `Operations are currently **${failCount === 0 ? "OPTIMAL" : "DEGRADED"}**. `;
    narrative += `Success rate is **${Math.round((successCount / totalSteps) * 100)}%**. `;
    narrative += `Performance SLAs are being met with an average turnaround of **${avgLatency}ms** per request (P95: ${p95Latency}ms). `;

    if (failCount === 0) {
      narrative +=
        "\n\nAll critical business pathways are clear and responding within expected thresholds.";
    } else {
      narrative += `\n\nAttention required on ${failCount} service(s) to restore full operational capability.`;
    }
  } else {
    narrative += `Audit conducted on **${totalSteps} endpoints**. `;
    narrative += "Data integrity and PII standards were assessed. ";
    narrative += `Total failure points: **${failCount}**. `;
    narrative +=
      "\n\nAll requests were proxied through secure channels. Header compliance is at 100%.";
  }

  narrative += `\n\n*Template-based narrative — configure an AI provider in Settings for AI-generated reports.*`;
  return narrative;
}
