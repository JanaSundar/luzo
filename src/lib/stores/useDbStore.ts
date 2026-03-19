/**
 * Database connection store — Zustand.
 *
 * Manages BYODB connection state.
 * DB URL is persisted to sessionStorage (not localStorage) for security.
 * Clears on browser close.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RuntimeTableStatus } from "@/lib/db";

type DbStatus = "disconnected" | "connecting" | "connected" | "error";

interface DbState {
  dbUrl: string;
  status: DbStatus;
  error: string | null;
  latencyMs: number | null;
  schemaReady: boolean;
  warnings: string[];
  tables: RuntimeTableStatus[];

  setDbUrl: (url: string) => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
}

export const useDbStore = create<DbState>()(
  persist(
    (set, get) => ({
      dbUrl: "",
      status: "disconnected",
      error: null,
      latencyMs: null,
      schemaReady: false,
      warnings: [],
      tables: [],

      setDbUrl: (url) => set({ dbUrl: url }),

      connect: async () => {
        const { dbUrl } = get();
        if (!dbUrl) {
          set({ error: "No connection URL provided", status: "error" });
          return false;
        }

        set({ status: "connecting", error: null });

        try {
          const res = await fetch("/api/db/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dbUrl }),
          });

          const data = await res.json();

          if (!res.ok || !data.connected) {
            set({
              status: "error",
              error: data.error || "Connection failed",
              latencyMs: data.latencyMs ?? null,
              schemaReady: false,
              warnings: data.warnings ?? [],
              tables: data.tables ?? [],
            });
            return false;
          }

          set({
            status: "connected",
            error: null,
            latencyMs: data.latencyMs,
            schemaReady: Boolean(data.schemaReady),
            warnings: data.warnings ?? [],
            tables: data.tables ?? [],
          });
          return Boolean(data.schemaReady);
        } catch (err) {
          set({
            status: "error",
            error: err instanceof Error ? err.message : "Connection failed",
            schemaReady: false,
            warnings: [],
            tables: [],
          });
          return false;
        }
      },

      disconnect: () =>
        set({
          dbUrl: "",
          status: "disconnected",
          error: null,
          latencyMs: null,
          schemaReady: false,
          warnings: [],
          tables: [],
        }),
    }),
    {
      name: "luzo-db-connection",
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
          dbUrl: s.dbUrl,
          status: (s.status === "connected" ? "disconnected" : s.status) as DbStatus,
        }) as unknown as DbState,
    }
  )
);
