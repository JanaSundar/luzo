/**
 * API route: Fetch available models from provider APIs.
 * Uses the same OpenAI-compatible /models endpoints that the AI SDK providers use.
 */

import { NextResponse } from "next/server";
import type { AiProvider } from "@/types";
import { logger } from "@/utils/logger";

const PROVIDER_API_ENDPOINTS: Record<AiProvider, string> = {
  openai: "https://api.openai.com/v1/models",
  openrouter: "https://openrouter.ai/api/v1/models",
  groq: "https://api.groq.com/openai/v1/models",
};

const FETCH_TIMEOUT_MS = 15_000;

function formatModelLabel(id: string): string {
  return id
    .split(/[-/]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function isChatModel(id: string, provider: AiProvider): boolean {
  const lower = id.toLowerCase();
  if (
    lower.includes("embedding") ||
    lower.includes("moderation") ||
    lower.includes("whisper") ||
    lower.includes("text-embedding")
  ) {
    return false;
  }
  if (provider === "openai") {
    return lower.startsWith("gpt-") || lower.startsWith("o1") || lower.startsWith("o3");
  }
  return true;
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
      { requestId, provider, path: `/api/providers/${provider}/models` },
      "Fetch models request received",
    );

    if (!["openai", "groq", "openrouter"].includes(provider)) {
      logger.warn({ requestId, provider }, "Invalid provider requested for models");
      return NextResponse.json({ error: "Invalid provider", models: [] }, { status: 400 });
    }

    const body = await request.json();
    const apiKey = body?.apiKey;

    if (!apiKey || typeof apiKey !== "string" || apiKey.length < 5) {
      logger.warn({ requestId, provider }, "Missing or invalid API key for model fetch");
      return NextResponse.json({ error: "API key is required", models: [] }, { status: 400 });
    }

    const endpoint = PROVIDER_API_ENDPOINTS[provider];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn(
        { requestId, provider, status: response.status },
        "Provider API returned error for models",
      );
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { error: "Invalid API key. Please check and try again.", models: [] },
          { status: 401 },
        );
      }
      if (response.status === 429) {
        return NextResponse.json(
          { error: "Rate limited. Please wait a moment and try again.", models: [] },
          { status: 429 },
        );
      }
      const errData = await response.json().catch(() => ({}));
      const message =
        errData?.error?.message ?? errData?.message ?? `Failed to fetch models: ${response.status}`;
      return NextResponse.json({ error: message, models: [] }, { status: response.status });
    }

    const data = (await response.json()) as {
      data?: Array<{ id?: string; name?: string }>;
    };

    const raw = data?.data ?? [];
    const models: { id: string; label: string }[] = [];

    for (const item of raw) {
      const id = item?.id ?? item?.name;
      if (!id || typeof id !== "string") continue;
      if (!isChatModel(id, provider)) continue;

      models.push({
        id,
        label: item?.name && typeof item.name === "string" ? item.name : formatModelLabel(id),
      });
    }

    models.sort((a, b) => a.id.localeCompare(b.id));

    logger.info({ requestId, provider, modelCount: models.length }, "Models fetched successfully");
    return NextResponse.json({ models });
  } catch (error) {
    const err = error as Error;
    const message =
      err?.name === "AbortError"
        ? "Request timed out. Please check your connection and try again."
        : (err?.message ?? "Failed to fetch models");

    logger.error({ requestId, error: message }, "Fetch models request failed");
    return NextResponse.json({ error: message, models: [] }, { status: 500 });
  }
}
