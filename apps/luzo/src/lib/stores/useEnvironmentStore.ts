import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { isSensitiveVariableKey } from "@/lib/utils/variableMetadata";
import type { Environment, EnvironmentSource, EnvironmentVariable, KeyValuePair } from "@/types";

export const ENVIRONMENT_STORAGE_KEY = "luzo-environment-store";

function sanitizeEnvironmentsForPersistence(environments: Environment[]): Environment[] {
  return environments.map((env) => ({
    ...env,
    variables: env.variables.map((v) => (isSensitiveVariableKey(v.key) ? { ...v, value: "" } : v)),
  }));
}

interface EnvironmentState {
  environments: Environment[];
  activeEnvironmentId: string | null;

  addEnvironment: (name: string, options?: { source?: EnvironmentSource }) => void;
  setActiveEnvironment: (id: string | null) => void;
  importEnvironments: (
    environments: Array<{
      name: string;
      source: EnvironmentSource;
      variables: EnvironmentVariable[];
    }>,
  ) => void;
  updateEnvironmentVariable: (envId: string, key: string, value: string, secret?: boolean) => void;
  toggleEnvironmentVariableSecret: (envId: string, key: string) => void;
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
          source: { kind: "manual", ref: "default" },
          variables: [] as KeyValuePair[],
        },
      ],
      activeEnvironmentId: "default",

      addEnvironment: (name, options) =>
        set((state) => {
          state.environments.push({
            id: crypto.randomUUID(),
            name,
            source: options?.source ?? { kind: "manual" },
            variables: [],
          });
        }),

      setActiveEnvironment: (id) =>
        set((state) => {
          state.activeEnvironmentId = id;
        }),

      importEnvironments: (environments) =>
        set((state) => {
          for (const incoming of environments) {
            const existing = state.environments.find(
              (environment) =>
                environment.source?.kind === incoming.source.kind &&
                environment.source?.ref &&
                environment.source.ref === incoming.source.ref,
            );
            if (existing) {
              existing.name = incoming.name;
              existing.source = { ...existing.source, ...incoming.source };
              existing.variables = incoming.variables.map((variable) => ({
                ...variable,
                secret: variable.secret ?? isSensitiveVariableKey(variable.key),
              }));
              state.activeEnvironmentId = existing.id;
              continue;
            }
            const id = crypto.randomUUID();
            state.environments.unshift({
              id,
              ...incoming,
              variables: incoming.variables.map((variable) => ({
                ...variable,
                secret: variable.secret ?? isSensitiveVariableKey(variable.key),
              })),
            });
            state.activeEnvironmentId = id;
          }
        }),

      updateEnvironmentVariable: (envId, key, value, secret) =>
        set((state) => {
          const env = state.environments.find((e) => e.id === envId);
          if (!env) return;

          const v = env.variables.find((v) => v.key === key);
          if (v) {
            v.value = value;
            if (secret !== undefined) {
              v.secret = secret;
            }
          } else {
            env.variables.push({
              key,
              value,
              enabled: true,
              secret: secret ?? isSensitiveVariableKey(key),
            });
          }
        }),

      toggleEnvironmentVariableSecret: (envId, key) =>
        set((state) => {
          const env = state.environments.find((e) => e.id === envId);
          const variable = env?.variables.find((v) => v.key === key);
          if (variable) {
            variable.secret = !variable.secret;
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
          env.variables.filter((v) => v.enabled).map((v) => [v.key, v.value]),
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
    },
  ),
);
