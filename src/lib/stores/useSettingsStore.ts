import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MODEL_REGISTRY } from "@/config/model-registry";
import type { RuntimeTableStatus } from "@/lib/db";
import type { AiProvider } from "@/types";

export type ValidationStatus = "idle" | "valid" | "invalid";

export interface ProviderConfig {
  apiKey: string;
  model: string;
  modelLabel?: string;
  validationStatus: ValidationStatus;
}

type DbStatus = "disconnected" | "connecting" | "connected" | "error";

interface SettingsState {
  // AI Config
  providers: Record<AiProvider, ProviderConfig>;
  activeAiProvider: AiProvider;

  // DB Config
  dbUrl: string;
  dbStatus: DbStatus;
  dbError: string | null;
  dbLatencyMs: number | null;
  dbSchemaReady: boolean;
  dbWarnings: string[];
  dbTables: RuntimeTableStatus[];

  // Actions
  setProviderConfig: (provider: AiProvider, config: Partial<ProviderConfig>) => void;
  setActiveAiProvider: (provider: AiProvider) => void;
  setDbUrl: (url: string) => void;
  setDbStatus: (
    status: Partial<
      Pick<
        SettingsState,
        "dbStatus" | "dbError" | "dbLatencyMs" | "dbSchemaReady" | "dbWarnings" | "dbTables"
      >
    >
  ) => void;
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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      providers: createInitialProviders(),
      activeAiProvider: "openrouter",
      dbUrl: "",
      dbStatus: "disconnected",
      dbError: null,
      dbLatencyMs: null,
      dbSchemaReady: false,
      dbWarnings: [],
      dbTables: [],

      setProviderConfig: (provider, config) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: { ...state.providers[provider], ...config },
          },
        })),

      setActiveAiProvider: (provider) => set({ activeAiProvider: provider }),

      setDbUrl: (dbUrl) => set({ dbUrl }),

      setDbStatus: (status) => set((state) => ({ ...state, ...status })),
    }),
    {
      name: "luzo-settings-store",
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
    }
  )
);
