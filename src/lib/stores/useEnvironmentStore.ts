import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { Environment, KeyValuePair } from "@/types";

export const ENVIRONMENT_STORAGE_KEY = "luzo-environment-store";

const SENSITIVE_KEY_PATTERN =
  /^(password|token|secret|api[_-]?key|bearer|credential|private[_-]?key|access[_-]?key|secret[_-]?key|auth|authorization)$/i;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key?.trim() ?? "");
}

function sanitizeEnvironmentsForPersistence(environments: Environment[]): Environment[] {
  return environments.map((env) => ({
    ...env,
    variables: env.variables.map((v) => (isSensitiveKey(v.key) ? { ...v, value: "" } : v)),
  }));
}

interface EnvironmentState {
  environments: Environment[];
  activeEnvironmentId: string | null;

  addEnvironment: (name: string) => void;
  setActiveEnvironment: (id: string | null) => void;
  updateEnvironmentVariable: (envId: string, key: string, value: string) => void;
  deleteEnvironmentVariable: (envId: string, key: string) => void;
  deleteEnvironment: (id: string) => void;
  getActiveEnvironmentVariables: () => Record<string, string>;
}

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    immer<EnvironmentState>((set, get) => ({
      environments: [
        {
          id: "default",
          name: "Default",
          variables: [] as KeyValuePair[],
        },
      ],
      activeEnvironmentId: "default",

      addEnvironment: (name) =>
        set((state) => {
          state.environments.push({
            id: crypto.randomUUID(),
            name,
            variables: [],
          });
        }),

      setActiveEnvironment: (id) =>
        set((state) => {
          state.activeEnvironmentId = id;
        }),

      updateEnvironmentVariable: (envId, key, value) =>
        set((state) => {
          const env = state.environments.find((e) => e.id === envId);
          if (!env) return;

          const v = env.variables.find((v) => v.key === key);
          if (v) {
            v.value = value;
          } else {
            env.variables.push({ key, value, enabled: true });
          }
        }),

      deleteEnvironmentVariable: (envId, key) =>
        set((state) => {
          const env = state.environments.find((e) => e.id === envId);
          if (env) {
            env.variables = env.variables.filter((v) => v.key !== key);
          }
        }),

      deleteEnvironment: (id) =>
        set((state) => {
          if (id === "default") return;
          state.environments = state.environments.filter((e) => e.id !== id);
          if (state.activeEnvironmentId === id) {
            state.activeEnvironmentId = "default";
          }
        }),

      getActiveEnvironmentVariables: () => {
        const { environments, activeEnvironmentId } = get();
        const env = environments.find((e) => e.id === activeEnvironmentId);
        if (!env) return {};
        return Object.fromEntries(
          env.variables.filter((v) => v.enabled).map((v) => [v.key, v.value])
        );
      },
    })),
    {
      name: ENVIRONMENT_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        environments: sanitizeEnvironmentsForPersistence(s.environments),
        activeEnvironmentId: s.activeEnvironmentId,
      }),
    }
  )
);
