/**
 * Fetches available models via the dedicated API route.
 * The API route calls provider /models endpoints (same as AI SDK uses).
 */

import type { AiProvider } from "@/types";

export interface ProviderModel {
  id: string;
  label: string;
}

export async function fetchProviderModels(
  provider: AiProvider,
  apiKey: string,
): Promise<ProviderModel[]> {
  const res = await fetch(`/api/providers/${provider}/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? `Failed to fetch models: ${res.status}`);
  }

  return data.models ?? [];
}
