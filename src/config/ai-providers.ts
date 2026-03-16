import type { AiProvider } from "@/types";

export interface ProviderConfig {
  id: AiProvider;
  name: string;
  baseUrl?: string;
  defaultModel: string;
  models: ModelOption[];
}

export interface ModelOption {
  id: string;
  name: string;
  contextWindow: number;
  costPer1kTokens?: { input: number; output: number };
  capabilities?: string[];
}

export const PROVIDER_CONFIGS: Record<AiProvider, ProviderConfig> = {
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-3.5-sonnet",
    models: [
      {
        id: "anthropic/claude-3.5-sonnet",
        name: "Claude 3.5 Sonnet",
        contextWindow: 200000,
        costPer1kTokens: { input: 0.003, output: 0.015 },
      },
      {
        id: "openai/gpt-4o",
        name: "GPT-4o",
        contextWindow: 128000,
        costPer1kTokens: { input: 0.005, output: 0.015 },
      },
      {
        id: "google/gemini-2.0-flash-thinking-exp",
        name: "Gemini 2.0 Flash Thinking",
        contextWindow: 1000000,
        costPer1kTokens: { input: 0.0, output: 0.0 },
      },
      {
        id: "meta-llama/llama-3.3-70b-instruct",
        name: "Llama 3.3 70B",
        contextWindow: 131072,
        costPer1kTokens: { input: 0.0002, output: 0.0002 },
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
        name: "Llama 3.3 70B Versatile",
        contextWindow: 128000,
        costPer1kTokens: { input: 0.00059, output: 0.00079 },
      },
      {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8B Instant",
        contextWindow: 128000,
        costPer1kTokens: { input: 0.00005, output: 0.00008 },
      },
      {
        id: "mixtral-8x7b-32768",
        name: "Mixtral 8x7B",
        contextWindow: 32768,
        costPer1kTokens: { input: 0.00027, output: 0.00027 },
      },
      {
        id: "gemma2-9b-it",
        name: "Gemma 2 9B",
        contextWindow: 8192,
        costPer1kTokens: { input: 0.0002, output: 0.0002 },
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
        name: "GPT-4o",
        contextWindow: 128000,
        costPer1kTokens: { input: 0.005, output: 0.015 },
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        contextWindow: 128000,
        costPer1kTokens: { input: 0.00015, output: 0.0006 },
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        contextWindow: 16385,
        costPer1kTokens: { input: 0.0005, output: 0.0015 },
      },
    ],
  },
};

export function getProviderConfig(provider: AiProvider): ProviderConfig {
  return PROVIDER_CONFIGS[provider];
}

export function getModelOption(provider: AiProvider, modelId: string): ModelOption | undefined {
  return PROVIDER_CONFIGS[provider].models.find((m) => m.id === modelId);
}
