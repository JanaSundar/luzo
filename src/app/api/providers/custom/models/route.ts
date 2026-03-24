/**
 * API route: Fetch models from custom (OpenAI-compatible) provider.
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";

const FETCH_TIMEOUT_MS = 15_000;

function formatModelLabel(id: string): string {
  return id
    .split(/[-/]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function isChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  return !(
    lower.includes("embedding") ||
    lower.includes("moderation") ||
    lower.includes("whisper") ||
    lower.includes("text-embedding")
  );
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const body = await request.json();
    const apiKey = body?.apiKey;
    const baseUrl = body?.baseUrl;

    logger.info(
      { requestId, baseUrl, path: "/api/providers/custom/models" },
      "Fetch custom models request received",
    );

    if (!apiKey || typeof apiKey !== "string" || apiKey.length < 5) {
      logger.warn({ requestId }, "Missing or invalid API key for custom model fetch");
      return NextResponse.json({ error: "API key is required", models: [] }, { status: 400 });
    }

    const url = typeof baseUrl === "string" && baseUrl.trim() ? baseUrl.trim() : undefined;
    if (!url) {
      logger.warn({ requestId }, "Missing Base URL for custom model fetch");
      return NextResponse.json({ error: "Base URL is required", models: [] }, { status: 400 });
    }

    const normalizedUrl = url.replace(/\/$/, "");
    const endpoint = `${normalizedUrl}/models`;

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
        { requestId, status: response.status },
        "Custom provider API returned error for models",
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
      if (!isChatModel(id)) continue;

      models.push({
        id,
        label: item?.name && typeof item.name === "string" ? item.name : formatModelLabel(id),
      });
    }

    models.sort((a, b) => a.id.localeCompare(b.id));

    logger.info({ requestId, modelCount: models.length }, "Custom models fetched successfully");
    return NextResponse.json({ models });
  } catch (error) {
    const err = error as Error;
    const message =
      err?.name === "AbortError"
        ? "Request timed out. Please check your connection and try again."
        : (err?.message ?? "Failed to fetch models");

    logger.error({ requestId, error: message }, "Fetch custom models request failed");
    return NextResponse.json({ error: message, models: [] }, { status: 500 });
  }
}
