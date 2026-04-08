/**
 * Model Registry — Vercel AI SDK based provider architecture.
 *
 * Replaces URL-based provider config with proper SDK abstraction.
 * Providers: OpenAI, OpenRouter (via OpenAI compat), Groq
 */

import type { AiProvider } from "@/types";
import type { ModelMetadata, ProviderRegistryEntry } from "@/types/pipeline-debug";

export const MODEL_REGISTRY: Record<AiProvider, ProviderRegistryEntry> = {
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    models: [
      {
        id: "anthropic/claude-3.5-sonnet",
        label: "Claude 3.5 Sonnet",
        provider: "openrouter",
        contextWindow: 200_000,
        speed: "medium",
        cost: "medium",
        quality: "excellent",
      },
      {
        id: "openai/gpt-4o",
        label: "GPT-4o",
        provider: "openrouter",
        contextWindow: 128_000,
        speed: "medium",
        cost: "medium",
        quality: "excellent",
      },
      {
        id: "google/gemini-2.0-flash-thinking-exp",
        label: "Gemini 2.0 Flash Thinking",
        provider: "openrouter",
        contextWindow: 1_000_000,
        speed: "fast",
        cost: "free",
        quality: "good",
      },
      {
        id: "meta-llama/llama-3.3-70b-instruct",
        label: "Llama 3.3 70B",
        provider: "openrouter",
        contextWindow: 131_072,
        speed: "fast",
        cost: "low",
        quality: "good",
        recommended: true,
      },
      {
        id: "deepseek/deepseek-r1",
        label: "DeepSeek R1",
        provider: "openrouter",
        contextWindow: 64_000,
        speed: "slow",
        cost: "low",
        quality: "excellent",
      },
    ],
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    defaultModel: "gpt-4o-mini",
    models: [
      {
        id: "gpt-4o",
        label: "GPT-4o",
        provider: "openai",
        contextWindow: 128_000,
        speed: "medium",
        cost: "medium",
        quality: "excellent",
      },
      {
        id: "gpt-4o-mini",
        label: "GPT-4o Mini",
        provider: "openai",
        contextWindow: 128_000,
        speed: "fast",
        cost: "low",
        quality: "good",
        recommended: true,
      },
      {
        id: "gpt-4-turbo",
        label: "GPT-4 Turbo",
        provider: "openai",
        contextWindow: 128_000,
        speed: "slow",
        cost: "high",
        quality: "excellent",
      },
      {
        id: "gpt-3.5-turbo",
        label: "GPT-3.5 Turbo",
        provider: "openai",
        contextWindow: 16_385,
        speed: "fast",
        cost: "low",
        quality: "basic",
      },
    ],
  },
  groq: {
    id: "groq",
    name: "Groq",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      {
        id: "llama-3.3-70b-versatile",
        label: "Llama 3.3 70B Versatile",
        provider: "groq",
        contextWindow: 128_000,
        speed: "fast",
        cost: "low",
        quality: "good",
        recommended: true,
      },
      {
        id: "llama-3.1-8b-instant",
        label: "Llama 3.1 8B Instant",
        provider: "groq",
        contextWindow: 128_000,
        speed: "fast",
        cost: "free",
        quality: "basic",
      },
      {
        id: "mixtral-8x7b-32768",
        label: "Mixtral 8x7B",
        provider: "groq",
        contextWindow: 32_768,
        speed: "fast",
        cost: "low",
        quality: "good",
      },
      {
        id: "gemma2-9b-it",
        label: "Gemma 2 9B",
        provider: "groq",
        contextWindow: 8_192,
        speed: "fast",
        cost: "free",
        quality: "basic",
      },
    ],
  },
};

export function getRegistry(provider: AiProvider): ProviderRegistryEntry {
  return MODEL_REGISTRY[provider];
}

export function getModelMetadata(provider: AiProvider, modelId: string): ModelMetadata | undefined {
  return MODEL_REGISTRY[provider].models.find((m) => m.id === modelId);
}

export function getRecommendedModel(provider: AiProvider): ModelMetadata | undefined {
  return MODEL_REGISTRY[provider].models.find((m) => m.recommended);
}

export function getAllProviders(): ProviderRegistryEntry[] {
  return Object.values(MODEL_REGISTRY);
}

export const SPEED_LABELS: Record<ModelMetadata["speed"], string> = {
  fast: "Fast",
  medium: "Medium",
  slow: "Slow",
};

export const COST_LABELS: Record<ModelMetadata["cost"], string> = {
  free: "Free",
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const QUALITY_LABELS: Record<ModelMetadata["quality"], string> = {
  basic: "Basic",
  good: "Good",
  excellent: "Excellent",
};
