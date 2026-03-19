import { create } from "zustand";
import type { ApiRequest, SavedRequest } from "@/types";

const MAX_HISTORY = 100;

interface CollectionHistoryState {
  history: SavedRequest[];
  addToHistory: (name: string, request: ApiRequest) => void;
  clearHistory: () => void;
}

export const useCollectionStore = create<CollectionHistoryState>()((set) => ({
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
      return { history: [entry, ...state.history].slice(0, MAX_HISTORY) };
    }),

  clearHistory: () => set({ history: [] }),
}));
