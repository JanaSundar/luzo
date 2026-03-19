"use server";

import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import {
  buildFallbackStructuredReport,
  buildReportSystemPrompt,
  buildToneFilteredAiInput,
  getReportSchema,
} from "@/lib/pipeline/report-generation";
import type {
  AIProviderConfig,
  AIReportConfig,
  ReducedContext,
  StructuredReport,
} from "@/types/pipeline-debug";

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

export async function generateAIReport(input: GenerateReportInput): Promise<GenerateReportResult> {
  const { context, config, provider, derivedTitle } = input;

  if (!provider.apiKey) {
    return {
      report: buildFallbackStructuredReport(context, config, derivedTitle),
      mode: "preview",
    };
  }

  try {
    const systemPrompt = buildReportSystemPrompt(config.tone, derivedTitle);
    const prompt = `${config.prompt.trim()}\n\nStructured execution input:\n${JSON.stringify(
      buildToneFilteredAiInput(context, config.tone),
      null,
      2
    )}`;

    const result = await generateObject({
      model: createProviderModel(provider),
      system: systemPrompt,
      prompt,
      schema: getReportSchema(config.tone),
      temperature: 0.2,
      maxOutputTokens: 2600,
    });

    return {
      report: result.object as StructuredReport,
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
