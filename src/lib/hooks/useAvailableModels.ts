import { useQuery } from "@tanstack/react-query";
import type { AiProvider, ProviderModel } from "@/types";

async function fetchAvailableModels(
  provider: AiProvider,
  apiKey?: string
): Promise<ProviderModel[]> {
  const response = await fetch("/api/models", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ provider, apiKey }),
  });

  if (!response.ok) {
    throw new Error("Failed to load models.");
  }

  const payload = (await response.json()) as { models: ProviderModel[] };
  return payload.models;
}

export function useAvailableModels(provider: AiProvider, apiKey?: string) {
  return useQuery({
    queryKey: [
      "available-models",
      provider,
      apiKey ? apiKey.length : 0,
      apiKey ? apiKey.slice(-4) : "",
    ],
    queryFn: () => fetchAvailableModels(provider, apiKey),
    staleTime: 5 * 60 * 1000,
  });
}
