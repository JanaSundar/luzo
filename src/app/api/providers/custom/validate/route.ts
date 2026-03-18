/**
 * API route: Validate custom (OpenAI-compatible) provider API key.
 */

import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiKey = body?.apiKey;
    const baseUrl = body?.baseUrl;

    if (!apiKey || typeof apiKey !== "string" || apiKey.length < 5) {
      return NextResponse.json({ valid: false, error: "API key is required" }, { status: 400 });
    }

    const url = typeof baseUrl === "string" && baseUrl.trim() ? baseUrl.trim() : undefined;
    if (!url) {
      return NextResponse.json({ valid: false, error: "Base URL is required" }, { status: 400 });
    }

    const normalizedUrl = url.replace(/\/$/, "");
    const modelId =
      typeof body?.model === "string" && body.model.trim() ? body.model.trim() : "gpt-4o-mini";
    const openai = createOpenAI({
      apiKey,
      baseURL: normalizedUrl,
    });

    await generateText({
      model: openai(modelId),
      prompt: "Hi",
      maxOutputTokens: 1,
    });

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

    return NextResponse.json(
      { valid: false, error: errorMessage },
      { status: status >= 400 && status < 600 ? status : 500 }
    );
  }
}
