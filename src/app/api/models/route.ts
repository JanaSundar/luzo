import { NextResponse } from "next/server";
import { fetchProviderModels } from "@/lib/ai/provider-api";
import type { AiProvider } from "@/types";

export async function POST(request: Request) {
  const { provider, apiKey } = (await request.json()) as {
    provider?: AiProvider;
    apiKey?: string;
  };

  if (!provider) {
    return NextResponse.json({ error: "Provider is required." }, { status: 400 });
  }

  const models = await fetchProviderModels(provider, apiKey);

  return NextResponse.json({ models });
}
