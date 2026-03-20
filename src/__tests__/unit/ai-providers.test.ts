import { describe, expect, it } from "vitest";
import { PROVIDER_CONFIGS, getModelOption, getProviderConfig } from "@/config/ai-providers";

describe("PROVIDER_CONFIGS", () => {
  it("has openrouter, groq, and openai providers", () => {
    expect(PROVIDER_CONFIGS.openrouter).toBeDefined();
    expect(PROVIDER_CONFIGS.groq).toBeDefined();
    expect(PROVIDER_CONFIGS.openai).toBeDefined();
  });

  it("each provider has models", () => {
    for (const config of Object.values(PROVIDER_CONFIGS)) {
      expect(config.models.length).toBeGreaterThan(0);
    }
  });

  it("each provider has a default model", () => {
    for (const config of Object.values(PROVIDER_CONFIGS)) {
      expect(config.defaultModel).toBeTruthy();
      expect(config.models.some((m) => m.id === config.defaultModel)).toBe(true);
    }
  });
});

describe("getProviderConfig", () => {
  it("returns correct config for openrouter", () => {
    const config = getProviderConfig("openrouter");
    expect(config.id).toBe("openrouter");
    expect(config.name).toBe("OpenRouter");
  });

  it("returns correct config for groq", () => {
    const config = getProviderConfig("groq");
    expect(config.id).toBe("groq");
  });
});

describe("getModelOption", () => {
  it("returns model when it exists", () => {
    const model = getModelOption("groq", "llama-3.3-70b-versatile");
    expect(model).toBeDefined();
    expect(model?.name).toBeTruthy();
  });

  it("returns undefined for unknown model", () => {
    const model = getModelOption("groq", "unknown-model-xyz");
    expect(model).toBeUndefined();
  });
});
