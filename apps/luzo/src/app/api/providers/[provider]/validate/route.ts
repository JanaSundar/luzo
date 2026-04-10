/**
 * API route: Validate provider API key using AI SDK.
 * Uses generateText with a minimal prompt to verify the key works.
 */

import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import type { AiProvider } from "@/types";
import { logger } from "@/utils/logger";

const VALIDATION_MODELS: Record<AiProvider, string> = {
  openai: "gpt-4o-mini",
  openrouter: "meta-llama/llama-3.3-70b-instruct",
  groq: "llama-3.1-8b-instant",
};

function getModel(provider: AiProvider, apiKey: string) {
  switch (provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey });
      return openai(VALIDATION_MODELS.openai);
    }
    case "groq": {
      const groq = createGroq({ apiKey });
      return groq(VALIDATION_MODELS.groq);
    }
    case "openrouter": {
      const openrouter = createOpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
      });
      return openrouter(VALIDATION_MODELS.openrouter);
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerParam } = await params;
  const provider = providerParam as AiProvider;
  const requestId = crypto.randomUUID();

  try {
    logger.info(
      { requestId, provider, path: `/api/providers/${provider}/validate` },
      "Validate provider request received",
    );

    if (!["openai", "groq", "openrouter"].includes(provider)) {
      logger.warn({ requestId, provider }, "Invalid provider for validation");
      return NextResponse.json({ valid: false, error: "Invalid provider" }, { status: 400 });
    }

    const body = await request.json();
    const apiKey = body?.apiKey;

    if (!apiKey || typeof apiKey !== "string" || apiKey.length < 5) {
      logger.warn({ requestId, provider }, "Missing or invalid API key for validation");
      return NextResponse.json({ valid: false, error: "API key is required" }, { status: 400 });
    }

    const model = getModel(provider, apiKey);

    await generateText({
      model,
      prompt: "Hi",
      maxOutputTokens: 1,
    });

    logger.info({ requestId, provider }, "Provider validation successful");
    return NextResponse.json({ valid: true });
  } catch (error) {
    const err = error as { status?: number; statusCode?: number; message?: string };
    const msg = String(err?.message ?? "Validation failed").toLowerCase();
    const status = err?.status ?? err?.statusCode ?? 500;

    let errorMessage = "Validation failed";
    if (
      status === 401 ||
      status === 403 ||
      msg.includes("401") ||
      msg.includes("unauthorized") ||
      msg.includes("invalid api key")
    ) {
      errorMessage = "Invalid API key. Please check and try again.";
    } else if (status === 429 || msg.includes("429") || msg.includes("rate limit")) {
      errorMessage = "Rate limited. Please wait a moment and try again.";
    } else if (err?.message) {
      errorMessage = err.message;
    }

    logger.error(
      { requestId, provider, status, error: errorMessage },
      "Provider validation failed",
    );

    return NextResponse.json(
      { valid: false, error: errorMessage },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
