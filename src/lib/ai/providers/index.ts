import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import type { AiModelConfig } from "@/types";

export function createProviderModel(config: AiModelConfig): BaseChatModel {
  const { provider, model, temperature = 0.7, maxTokens = 4096, apiKey } = config;

  switch (provider) {
    case "groq":
      return new ChatGroq({
        model,
        temperature,
        maxTokens,
        apiKey: apiKey ?? process.env.GROQ_API_KEY,
      });

    case "openrouter":
      return new ChatOpenAI({
        model,
        temperature,
        maxTokens,
        apiKey: apiKey ?? process.env.OPENROUTER_API_KEY,
        configuration: {
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
            "X-Title": "AI API Playground",
          },
        },
      });

    case "openai":
      return new ChatOpenAI({
        model,
        temperature,
        maxTokens,
        apiKey: apiKey ?? process.env.OPENAI_API_KEY,
      });

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
