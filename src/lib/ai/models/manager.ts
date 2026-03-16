import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { AiModelConfig } from "@/types";
import { createProviderModel } from "../providers/index";

class ModelManager {
  private cache = new Map<string, BaseChatModel>();

  private getCacheKey(config: AiModelConfig): string {
    return `${config.provider}:${config.model}:${config.temperature ?? 0.7}:${config.maxTokens ?? 4096}`;
  }

  getModel(config: AiModelConfig): BaseChatModel {
    const key = this.getCacheKey(config);

    if (!this.cache.has(key)) {
      this.cache.set(key, createProviderModel(config));
    }

    const model = this.cache.get(key);
    if (!model) {
      throw new Error("Model cache invariant violated");
    }
    return model;
  }

  invalidate(config?: AiModelConfig): void {
    if (config) {
      this.cache.delete(this.getCacheKey(config));
    } else {
      this.cache.clear();
    }
  }
}

export const modelManager = new ModelManager();
