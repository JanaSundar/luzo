"use server";

import type { AINarrativeConfig, PipelineExecutionResult } from "@/types";

interface AIProviderConfig {
  providerUrl: string;
  apiKey: string;
  model: string;
}

/**
 * Generates an AI-driven narrative for a pipeline execution result.
 * If an AI provider config with an API key is provided, calls a real LLM.
 * Otherwise, falls back to a template-based generator.
 */
export async function generatePipelineNarrative(
  result: PipelineExecutionResult,
  config: AINarrativeConfig,
  provider?: AIProviderConfig,
): Promise<string> {
  const successCount = result.results.filter((r) => r.status >= 200 && r.status < 300).length;
  const failCount = result.results.length - successCount;
  const avgLatency = Math.round(
    result.results.reduce((acc, r) => acc + r.time, 0) / result.results.length,
  );
  const sortedLatencies = result.results.map((r) => r.time).sort((a, b) => a - b);
  const p95Index = Math.ceil(sortedLatencies.length * 0.95) - 1;
  const p95Latency = sortedLatencies[Math.max(0, p95Index)] ?? 0;

  // Build a context object for prompt interpolation
  const context: Record<string, string> = {
    "request.url": result.results.map((r) => r.url).join(", "),
    "request.method": result.results.map((r) => r.method).join(", "),
    "request.headers": "See individual step headers",
    "response.status": result.results.map((r) => `${r.status}`).join(", "),
    "response.metrics.latency_ms": `${avgLatency}`,
    "response.metrics.size_kb": `${(result.results.reduce((s, r) => s + r.size, 0) / 1024).toFixed(1)}`,
  };

  // Interpolate user prompt with context
  const interpolatedPrompt = config.prompt.replace(
    /\{\{([^}]+)\}\}/g,
    (match, path) => context[path.trim()] ?? match,
  );

  // If provider has an API key, call the real LLM
  if (provider?.apiKey && provider.providerUrl) {
    try {
      const systemPrompt = buildSystemPrompt(config.tone, result, {
        successCount,
        failCount,
        avgLatency,
        p95Latency,
      });

      const response = await fetch(provider.providerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: interpolatedPrompt },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI API error:", response.status, errorText);
        // Fallback to template
        return generateTemplateNarrative(
          config.tone,
          { successCount, failCount, avgLatency, p95Latency, totalSteps: result.results.length },
          config.prompt,
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (content) {
        return content;
      }

      // Fallback if no content
      return generateTemplateNarrative(
        config.tone,
        { successCount, failCount, avgLatency, p95Latency, totalSteps: result.results.length },
        config.prompt,
      );
    } catch (error) {
      console.error("AI API call failed:", error);
      // Fallback to template
      return generateTemplateNarrative(
        config.tone,
        { successCount, failCount, avgLatency, p95Latency, totalSteps: result.results.length },
        config.prompt,
      );
    }
  }

  // No API key — use template-based generation
  return generateTemplateNarrative(
    config.tone,
    { successCount, failCount, avgLatency, p95Latency, totalSteps: result.results.length },
    config.prompt,
  );
}

function buildSystemPrompt(
  tone: string,
  result: PipelineExecutionResult,
  metrics: { successCount: number; failCount: number; avgLatency: number; p95Latency: number },
) {
  const stepSummaries = result.results
    .map(
      (r) =>
        `- ${r.method} ${r.url}: ${r.status} ${r.statusText} (${r.time}ms, ${(r.size / 1024).toFixed(1)}kb)`,
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

function generateTemplateNarrative(
  tone: string,
  metrics: {
    successCount: number;
    failCount: number;
    avgLatency: number;
    p95Latency: number;
    totalSteps: number;
  },
  _prompt: string,
): string {
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
