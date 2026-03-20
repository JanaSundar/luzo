import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { areRequestsHistoryEquivalent } from "@/lib/history/historyRequestSignature";
import { createIndexedDbStorage } from "@/lib/storage/zustand-indexeddb";
import type { ApiRequest, SavedRequest } from "@/types";

const MAX_HISTORY = 100;

interface HistoryState {
  history: SavedRequest[];
  addToHistory: (name: string, request: ApiRequest) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    immer((set) => ({
      history: [],

      addToHistory: (name, request) =>
        set((state) => {
          const now = new Date().toISOString();
          const dupIndex = state.history.findIndex((h) =>
            areRequestsHistoryEquivalent(h.request, request)
          );

          if (dupIndex !== -1) {
            const prev = state.history[dupIndex];
            const updated: SavedRequest = {
              ...prev,
              updatedAt: now,
              name,
              request,
            };
            state.history = [updated, ...state.history.filter((_, i) => i !== dupIndex)].slice(
              0,
              MAX_HISTORY
            );
            return;
          }

          const entry: SavedRequest = {
            id: crypto.randomUUID(),
            name,
            request,
            createdAt: now,
            updatedAt: now,
          };
          state.history = [entry, ...state.history].slice(0, MAX_HISTORY);
        }),

      removeFromHistory: (id) =>
        set((state) => {
          state.history = state.history.filter((h) => h.id !== id);
        }),

      clearHistory: () =>
        set((state) => {
          state.history = [];
        }),
    })),
    {
      name: "luzo-history-store",
      storage: createJSONStorage(() => createIndexedDbStorage({ dbName: "luzo-history" })),
    }
  )
);
