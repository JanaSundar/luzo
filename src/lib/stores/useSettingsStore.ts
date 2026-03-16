import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PROVIDER_CONFIGS } from "@/config/ai-providers";
import type { AiProvider, UserSettings } from "@/types";

interface SettingsState extends UserSettings {
  setTheme: (theme: UserSettings["theme"]) => void;
  setApiKey: (provider: AiProvider, key: string) => void;
  setAiConfig: (config: Partial<UserSettings["aiConfig"]>) => void;
  getApiKey: (provider: AiProvider) => string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: "system",
      apiKeys: { openrouter: "", groq: "", openai: "" },
      aiConfig: {
        provider: "openrouter",
        model: PROVIDER_CONFIGS.openrouter.defaultModel,
        temperature: 0.7,
        maxTokens: 4096,
      },

      setTheme: (theme) => set({ theme }),

      setApiKey: (provider, key) => set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),

      setAiConfig: (config) => set((s) => ({ aiConfig: { ...s.aiConfig, ...config } })),

      getApiKey: (provider) => get().apiKeys[provider],
    }),
    { name: "settings-store" }
  )
);
