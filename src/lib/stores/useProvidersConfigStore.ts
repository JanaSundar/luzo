/**
 * Multi-provider AI config store — Zustand.
 *
 * Manages API keys and models per provider.
 * Persisted to sessionStorage (clears on browser close).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AiProvider } from "@/types";
import { MODEL_REGISTRY } from "@/config/model-registry";

export type ValidationStatus = "idle" | "valid" | "invalid";

export interface ProviderConfig {
  apiKey: string;
  model: string;
  modelLabel?: string;
  validationStatus: ValidationStatus;
}

interface ProvidersConfigState {
  providers: Record<AiProvider, ProviderConfig>;
  activeProvider: AiProvider;

  setProviderConfig: (provider: AiProvider, config: Partial<ProviderConfig>) => void;
  setActiveProvider: (provider: AiProvider) => void;
  getProviderConfig: (provider: AiProvider) => ProviderConfig;
}

const AI_PROVIDERS: AiProvider[] = ["openai", "openrouter", "groq"];

function createInitialProviders(): Record<AiProvider, ProviderConfig> {
  return AI_PROVIDERS.reduce(
    (acc, id) => {
      const registry = MODEL_REGISTRY[id];
      acc[id] = {
        apiKey: "",
        model: registry?.defaultModel ?? "",
        validationStatus: "idle",
      };
      return acc;
    },
    {} as Record<AiProvider, ProviderConfig>
  );
}

export const useProvidersConfigStore = create<ProvidersConfigState>()(
  persist(
    (set, get) => ({
      providers: createInitialProviders(),
      activeProvider: "openrouter",

      setProviderConfig: (provider, config) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: { ...state.providers[provider], ...config },
          },
        })),

      setActiveProvider: (provider) => set({ activeProvider: provider }),

      getProviderConfig: (provider) => {
        const state = get();
        return state.providers[provider] ?? createInitialProviders()[provider];
      },
    }),
    {
      name: "luzo-providers-config",
      storage: {
        getItem: (name) => {
          if (typeof window === "undefined") return null;
          const value = sessionStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          if (typeof window === "undefined") return;
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          if (typeof window === "undefined") return;
          sessionStorage.removeItem(name);
        },
      },
      partialize: (s) =>
        ({
          providers: s.providers,
          activeProvider: s.activeProvider,
        }) as unknown as ProvidersConfigState,
    }
  )
);
