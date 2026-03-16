import { createOpenAI } from "@ai-sdk/openai";
import { PROVIDER_CONFIGS } from "@/config/ai-providers";
import type { AiModelConfig, AiProvider, ProviderModel } from "@/types";

function getProviderApiKey(provider: AiProvider, apiKey?: string) {
  switch (provider) {
    case "openrouter":
      return apiKey ?? process.env.OPENROUTER_API_KEY ?? "";
    case "groq":
      return apiKey ?? process.env.GROQ_API_KEY ?? "";
    case "openai":
      return apiKey ?? process.env.OPENAI_API_KEY ?? "";
  }
}

const AUTOMATION_MODELS_REGEX =
  /(gpt-4|claude-3|gemini-(1\.5|2\.0)|llama-3\.(1|3)-(70b|405b)|mixtral-8x22b|o1|sonnet|opus|pro|flash)/i;

export function isAutomationCapable(modelId: string): boolean {
  return AUTOMATION_MODELS_REGEX.test(modelId);
}

export function getAiSdkModel(config: AiModelConfig) {
  const { provider, model } = config;
  const apiKey = getProviderApiKey(provider, config.apiKey);

  switch (provider) {
    case "openrouter": {
      const openrouter = createOpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        headers: {
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": "AI API Playground",
        },
      });
      return openrouter(model);
    }

    case "groq": {
      const groq = createOpenAI({
        apiKey,
        baseURL: "https://api.groq.com/openai/v1",
      });
      return groq(model);
    }

    case "openai": {
      const openai = createOpenAI({
        apiKey,
      });
      return openai(model);
    }
  }
}

function toFallbackModels(provider: AiProvider): ProviderModel[] {
  return PROVIDER_CONFIGS[provider].models.map((model) => ({
    id: model.id,
    name: model.name,
    contextWindow: model.contextWindow,
    capabilities: isAutomationCapable(model.id) ? ["automation"] : [],
  }));
}

export async function fetchProviderModels(
  provider: AiProvider,
  apiKey?: string
): Promise<ProviderModel[]> {
  try {
    switch (provider) {
      case "openrouter": {
        const response = await fetch("https://openrouter.ai/api/v1/models", {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch OpenRouter models");
        }

        const payload = (await response.json()) as {
          data?: Array<{ id: string; name?: string; context_length?: number }>;
        };

        return (
          payload.data?.map((model) => {
            const capabilities = isAutomationCapable(model.id) ? ["automation"] : [];
            return {
              id: model.id,
              name: model.name ?? model.id,
              contextWindow: model.context_length,
              capabilities,
            };
          }) ?? toFallbackModels(provider)
        );
      }

      case "groq":
      case "openai": {
        if (!apiKey) {
          return toFallbackModels(provider);
        }

        const baseUrl =
          provider === "groq"
            ? "https://api.groq.com/openai/v1/models"
            : "https://api.openai.com/v1/models";

        const response = await fetch(baseUrl, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${provider} models`);
        }

        const payload = (await response.json()) as {
          data?: Array<{ id: string }>;
        };

        return (
          payload.data?.map((model) => ({
            id: model.id,
            name: model.id,
            capabilities: isAutomationCapable(model.id) ? ["automation"] : [],
          })) ?? toFallbackModels(provider)
        );
      }
    }
  } catch {
    return toFallbackModels(provider);
  }
}
