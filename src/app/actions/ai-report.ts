"use server";

import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import {
  buildFallbackStructuredReport,
  buildReportSystemPrompt,
  buildToneFilteredAiInput,
  toEndpointMetrics,
  toReportMetrics,
} from "@/lib/pipeline/report-generation";
import type {
  AIProviderConfig,
  AIReportConfig,
  ReducedContext,
  StructuredReport,
} from "@/types/pipeline-debug";
import type { ReportLength } from "@/types/pipeline-report";

interface GenerateReportInput {
  context: ReducedContext;
  config: AIReportConfig;
  provider: AIProviderConfig;
  derivedTitle?: string;
}

interface GenerateReportResult {
  report: StructuredReport;
  mode: "ai" | "preview";
  tokensUsed?: number;
}

function getMaxOutputTokens(length: ReportLength): number {
  switch (length) {
    case "short":
      return 2000;
    case "medium":
      return 4000;
    case "long":
      return 8000;
  }
}

export async function generateAIReport(input: GenerateReportInput): Promise<GenerateReportResult> {
  const { context, config, provider, derivedTitle } = input;

  if (!provider.apiKey) {
    return {
      report: buildFallbackStructuredReport(context, config, derivedTitle),
      mode: "preview",
    };
  }

  try {
    const length = config.length ?? "medium";
    const systemPrompt = buildReportSystemPrompt(config.tone, length, derivedTitle);
    const aiInput = buildToneFilteredAiInput(context, config.tone, length);
    const prompt = `${config.prompt.trim()}

REPORT LENGTH REQUIREMENT: ${length.toUpperCase()}
${length === "short" ? "- Max 1 page summary with key findings only" : ""}
${length === "medium" ? "- Moderate detail with step analysis" : ""}
${length === "long" ? "- Detailed breakdown with deep analysis (3+ pages)" : ""}

Structured execution input:
${JSON.stringify(aiInput, null, 2)}`;

    const result = await generateText({
      model: createProviderModel(provider),
      system: systemPrompt,
      prompt,
      temperature: 0.2,
      maxOutputTokens: getMaxOutputTokens(length),
    });

    let report: StructuredReport;
    try {
      const text = result.text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      report = JSON.parse(jsonStr) as StructuredReport;

      const computedMetrics = toReportMetrics(context);
      const computedEndpointMetrics = toEndpointMetrics(context);

      report.metrics = computedMetrics;

      report.endpointMetrics = computedEndpointMetrics;

      report.requests = computedEndpointMetrics.map((endpoint, index) => ({
        stepId: endpoint.stepId,
        name: endpoint.stepName,
        method: endpoint.method,
        url: endpoint.url,
        statusCode: endpoint.statusCode,
        latencyMs: endpoint.latencyMs,
        analysis: report.requests?.[index]?.analysis ?? `${endpoint.stepName} completed.`,
      }));
    } catch {
      return {
        report: buildFallbackStructuredReport(context, config, derivedTitle),
        mode: "preview",
      };
    }

    return {
      report,
      mode: "ai",
      tokensUsed: result.usage?.totalTokens,
    };
  } catch (error) {
    console.error("AI report generation failed:", error);
    return {
      report: buildFallbackStructuredReport(context, config, derivedTitle),
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
