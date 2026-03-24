"use server";

import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import {
  buildFallbackStructuredReport,
  buildHealthSummary,
  buildReportSystemPrompt,
  buildToneFilteredAiInput,
  toEndpointMetrics,
  toReportMetrics,
} from "@/features/pipeline/report-generation";
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
      report.healthSummary = report.healthSummary ?? buildHealthSummary(report);
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
  } catch {
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

export async function refineReportSection(input: {
  report: StructuredReport;
  sectionKey: string;
  instruction: string;
  provider: AIProviderConfig;
  config: AIReportConfig;
}): Promise<GenerateReportResult> {
  const { report, sectionKey, instruction, provider, config } = input;

  if (!provider.apiKey) {
    return { report, mode: "preview" };
  }

  try {
    const currentContent = sectionKey.startsWith("request:")
      ? report.requests.find((r) => r.stepId === sectionKey.split(":")[1])?.analysis
      : report[sectionKey as keyof StructuredReport];

    const systemPrompt = `You are an expert API quality engineer. Your task is to refine a specific section of a pipeline execution report.
Tone: ${config.tone}
Section: ${sectionKey}

Original Content:
${typeof currentContent === "string" ? currentContent : JSON.stringify(currentContent)}

User Instruction:
${instruction}

Return only the refined content for this specific section. If the section expects a list (like insights/risks), return a JSON array of strings. If it's a narrative (summary/conclusion/analysis), return a plain text string. Do not include any other commentary.`;

    const result = await generateText({
      model: createProviderModel(provider),
      system: systemPrompt,
      prompt: "Refine the section based on the instructions.",
      temperature: 0.3,
    });

    const refinedText = result.text.trim();
    const updatedReport = { ...report };

    if (sectionKey.startsWith("request:")) {
      const stepId = sectionKey.split(":")[1];
      updatedReport.requests = updatedReport.requests.map((r) =>
        r.stepId === stepId ? { ...r, analysis: refinedText } : r,
      );
    } else {
      const key = sectionKey as keyof StructuredReport;
      try {
        if (refinedText.startsWith("[") || refinedText.startsWith("{")) {
          const parsed = JSON.parse(refinedText);
          (updatedReport as Record<string, unknown>)[key] = parsed;
        } else {
          (updatedReport as Record<string, unknown>)[key] = refinedText;
        }
      } catch {
        (updatedReport as Record<string, unknown>)[key] = refinedText;
      }
    }

    return {
      report: updatedReport,
      mode: "ai",
      tokensUsed: result.usage?.totalTokens,
    };
  } catch {
    return { report, mode: "ai" };
  }
}

export async function editReportSelection(input: {
  selectedText: string;
  sectionKey: string;
  sectionTitle: string;
  sectionContent: string;
  reportContext: string;
  instruction: string;
  provider: AIProviderConfig;
  config: AIReportConfig;
}): Promise<{ replacement: string; tokensUsed?: number }> {
  const {
    selectedText,
    sectionKey,
    sectionTitle,
    sectionContent,
    reportContext,
    instruction,
    provider,
    config,
  } = input;

  if (!provider.apiKey) {
    throw new Error("AI provider not configured.");
  }

  const result = await generateText({
    model: createProviderModel(provider),
    system: `You are editing one selected span inside a pipeline report.
Tone: ${config.tone}
Section key: ${sectionKey}
Section title: ${sectionTitle}

Full report context:
${reportContext}

Section content:
${sectionContent}

Selected text:
${selectedText}

User instruction:
${instruction}

Return only the replacement text for the selected span. Do not wrap it in quotes or add any commentary.`,
    prompt: "Rewrite the selected text only.",
    temperature: 0.3,
  });

  return {
    replacement: result.text.trim(),
    tokensUsed: result.usage?.totalTokens,
  };
}
