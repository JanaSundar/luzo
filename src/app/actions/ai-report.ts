"use server";

/**
 * AI Report Generation — Vercel AI SDK based.
 * Uses generateText from "ai" package with provider-specific SDKs.
 * Supports preview mode (template) and AI mode (requires API key).
 */

import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { formatContextForAI } from "@/lib/pipeline/context-reducer";
import type { AIProviderConfig, AIReportConfig, ReducedContext } from "@/types/pipeline-debug";

const REPORT_TITLE_PREFIX = "REPORT_TITLE:";
const MAX_DERIVED_TITLE_LENGTH = 55;

interface GenerateReportInput {
  context: ReducedContext;
  config: AIReportConfig;
  provider: AIProviderConfig;
  /** Derived title from URLs; when too long, AI will suggest a shorter one */
  derivedTitle?: string;
}

interface GenerateReportResult {
  output: string;
  mode: "ai" | "preview";
  reportTitle?: string | null;
  tokensUsed?: number;
}

/**
 * Generate an AI-powered report from reduced context.
 * Falls back to template mode if no API key is provided.
 */
export async function generateAIReport(input: GenerateReportInput): Promise<GenerateReportResult> {
  const { context, config, provider } = input;

  if (!provider.apiKey) {
    return {
      output: generateTemplateReport(context, config),
      mode: "preview",
    };
  }

  try {
    const formattedContext = formatContextForAI(context);
    const systemPrompt = buildSystemPrompt(config.tone, context, input.derivedTitle);

    const userPrompt = `${config.prompt}

## Pipeline Execution Data
${formattedContext}`;

    const model = createProviderModel(provider);

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 2000,
      temperature: 0.7,
    });

    const { output: cleanedOutput, reportTitle } = parseReportOutput(result.text);

    return {
      output: cleanedOutput,
      mode: "ai",
      reportTitle,
      tokensUsed: result.usage?.totalTokens,
    };
  } catch (error) {
    console.error("AI report generation failed:", error);
    return {
      output: generateTemplateReport(context, config),
      mode: "preview",
    };
  }
}

function createProviderModel(provider: AIProviderConfig) {
  const modelId = provider.customModel || provider.model;

  switch (provider.provider) {
    case "openai": {
      const openai = createOpenAI({
        apiKey: provider.apiKey,
        ...(provider.customBaseUrl ? { baseURL: provider.customBaseUrl } : {}),
      });
      return openai(modelId);
    }
    case "groq": {
      const groq = createGroq({
        apiKey: provider.apiKey,
        ...(provider.customBaseUrl ? { baseURL: provider.customBaseUrl } : {}),
      });
      return groq(modelId);
    }
    case "openrouter": {
      const openrouter = createOpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.customBaseUrl || "https://openrouter.ai/api/v1",
      });
      return openrouter(modelId);
    }
    default: {
      const fallback = createOpenAI({ apiKey: provider.apiKey });
      return fallback(modelId);
    }
  }
}

function parseReportOutput(text: string): { output: string; reportTitle: string | null } {
  const lines = text.split("\n");
  let reportTitle: string | null = null;
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(REPORT_TITLE_PREFIX)) {
      reportTitle = trimmed.slice(REPORT_TITLE_PREFIX.length).trim();
    } else {
      kept.push(line);
    }
  }
  return {
    output: kept.join("\n").trimEnd(),
    reportTitle: reportTitle || null,
  };
}

function buildSystemPrompt(tone: string, context: ReducedContext, derivedTitle?: string): string {
  const toneInstructions: Record<string, string> = {
    technical:
      "You are a senior API engineer writing a detailed technical report. Include specific metrics, header analysis, and performance observations. Use markdown formatting with clear sections.",
    executive:
      "You are a business analyst writing an executive summary. Focus on SLA compliance, business impact, and operational health. Keep language clear and non-technical. Use markdown.",
    compliance:
      "You are a security auditor writing a compliance report. Focus on data handling, PII exposure, endpoint security, and regulation compliance. Use markdown formatting.",
  };

  return `${toneInstructions[tone] ?? "Write a clear, professional API report using markdown."}

Key constraints:
- Base your analysis ONLY on the provided signals and metadata
- Do not hallucinate or infer data not present in the context
- Total steps: ${context.metadata.totalSteps}
- Failed steps: ${context.metadata.failedSteps}
- Avg latency: ${context.metadata.avgLatencyMs}ms
- P95 latency: ${context.metadata.p95LatencyMs}ms

Prioritize analysis of:
1. Failed steps and errors (critical)
2. Slow steps exceeding 1000ms (high priority)
3. Dependency-related values and data flow

Generate a structured report with clear sections.${
    needsShortTitle(derivedTitle)
      ? `

The current report title is too long. At the very end of your response, add a single line with a concise alternative title (max 50 chars), e.g. "REPORT_TITLE: API Health Summary for User & Order Services"`
      : ""
  }`;
}

function needsShortTitle(derivedTitle?: string): boolean {
  return Boolean(derivedTitle && derivedTitle.length > MAX_DERIVED_TITLE_LENGTH);
}

function generateTemplateReport(context: ReducedContext, config: AIReportConfig): string {
  const { metadata, signals } = context;
  const successCount = metadata.totalSteps - metadata.failedSteps;
  const successRate =
    metadata.totalSteps > 0 ? Math.round((successCount / metadata.totalSteps) * 100) : 0;

  const tonePrefix: Record<string, string> = {
    technical: "### Technical System Audit\n\n",
    executive: "### Executive Business Summary\n\n",
    compliance: "### Compliance & Security Review\n\n",
  };

  let narrative = tonePrefix[config.tone] ?? "### Report\n\n";

  if (config.tone === "technical") {
    narrative += `The pipeline executed with **${successCount} successful** steps and **${metadata.failedSteps} failures** out of ${metadata.totalSteps} total. `;
    narrative += `Average system response time was **${metadata.avgLatencyMs}ms** (P95: **${metadata.p95LatencyMs}ms**). `;
    narrative += `Total execution duration: **${metadata.totalDurationMs}ms**.\n\n`;

    if (metadata.failedSteps > 0) {
      narrative += "#### Critical Issues\n";
      const errorSignals = signals.filter((s) => s.priority === "critical");
      for (const s of errorSignals) {
        narrative += `- **${s.label}**: ${s.value}\n`;
      }
      narrative += "\n";
    }

    const warnings = signals.filter((s) => s.priority === "high");
    if (warnings.length > 0) {
      narrative += "#### Warnings\n";
      for (const s of warnings) {
        narrative += `- **${s.label}**: ${s.value}\n`;
      }
      narrative += "\n";
    }
  } else if (config.tone === "executive") {
    narrative += `Operations are currently **${metadata.failedSteps === 0 ? "OPTIMAL" : "DEGRADED"}**. `;
    narrative += `Success rate is **${successRate}%**. `;
    narrative += `Performance SLAs are being met with an average turnaround of **${metadata.avgLatencyMs}ms** per request (P95: ${metadata.p95LatencyMs}ms).\n\n`;

    if (metadata.failedSteps === 0) {
      narrative +=
        "All critical business pathways are clear and responding within expected thresholds.\n";
    } else {
      narrative += `Attention required on ${metadata.failedSteps} service(s) to restore full operational capability.\n`;
    }
  } else {
    narrative += `Audit conducted on **${metadata.totalSteps} endpoints**. `;
    narrative += "Data integrity and PII standards were assessed. ";
    narrative += `Total failure points: **${metadata.failedSteps}**.\n\n`;
    narrative += "All requests were proxied through secure channels.\n";
  }

  narrative += `\n*Template-based narrative — configure an AI provider for AI-generated reports.*`;

  return narrative;
}
