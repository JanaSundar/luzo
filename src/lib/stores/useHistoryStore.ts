import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { createIndexedDbStorage } from "@/lib/storage/zustand-indexeddb";
import type { ApiRequest, SavedRequest } from "@/types";

const MAX_HISTORY = 100;

interface HistoryState {
  history: SavedRequest[];
  addToHistory: (name: string, request: ApiRequest) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    immer((set) => ({
      history: [],

      addToHistory: (name, request) =>
        set((state) => {
          const now = new Date().toISOString();
          const entry: SavedRequest = {
            id: crypto.randomUUID(),
            name,
            request,
            createdAt: now,
            updatedAt: now,
          };
          state.history = [entry, ...state.history].slice(0, MAX_HISTORY);
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
