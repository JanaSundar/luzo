import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApiRequest, Collection, SavedRequest } from "@/types";

const MAX_HISTORY = 100;

interface CollectionState {
  collections: Collection[];
  history: SavedRequest[];

  addToHistory: (name: string, request: ApiRequest) => void;
  clearHistory: () => void;

  createCollection: (name: string) => Collection;
  deleteCollection: (id: string) => void;
  renameCollection: (id: string, name: string) => void;
  saveRequest: (name: string, request: ApiRequest, collectionId?: string) => void;
  deleteRequest: (id: string) => void;
  duplicateRequest: (id: string) => void;
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      collections: [],
      history: [],

      addToHistory: (name, request) =>
        set((s) => {
          const entry: SavedRequest = {
            id: crypto.randomUUID(),
            name,
            request,
            createdAt: new Date().toISOString(),
          };
          return {
            history: [entry, ...s.history].slice(0, MAX_HISTORY),
          };
        }),

      clearHistory: () => set({ history: [] }),

      createCollection: (name) => {
        const collection: Collection = {
          id: crypto.randomUUID(),
          name,
          requests: [],
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ collections: [...s.collections, collection] }));
        return collection;
      },

      deleteCollection: (id) =>
        set((s) => ({ collections: s.collections.filter((c) => c.id !== id) })),

      renameCollection: (id, name) =>
        set((s) => ({
          collections: s.collections.map((c) => (c.id === id ? { ...c, name } : c)),
        })),

      saveRequest: (name, request, collectionId) => {
        const saved: SavedRequest = {
          id: crypto.randomUUID(),
          name,
          request,
          collectionId,
          createdAt: new Date().toISOString(),
        };

        if (!collectionId) {
          set((s) => ({ history: [saved, ...s.history] }));
          return;
        }

        set((s) => ({
          collections: s.collections.map((c) => {
            if (c.id !== collectionId) return c;
            return { ...c, requests: [...c.requests, saved] };
          }),
        }));
      },

      deleteRequest: (id) =>
        set((s) => ({
          collections: s.collections.map((c) => ({
            ...c,
            requests: c.requests.filter((r) => r.id !== id),
          })),
          history: s.history.filter((r) => r.id !== id),
        })),

      duplicateRequest: (id) => {
        const { collections, history } = get();
        const allRequests = [...history, ...collections.flatMap((c) => c.requests)];
        const original = allRequests.find((r) => r.id === id);
        if (!original) return;

        const duplicate: SavedRequest = {
          ...original,
          id: crypto.randomUUID(),
          name: `${original.name} (copy)`,
          createdAt: new Date().toISOString(),
        };

        if (original.collectionId) {
          set((s) => ({
            collections: s.collections.map((c) => {
              if (c.id !== original.collectionId) return c;
              return { ...c, requests: [...c.requests, duplicate] };
            }),
          }));
        } else {
          set((s) => ({ history: [...s.history, duplicate] }));
        }
      },
    }),
    { name: "collection-store" }
  )
);
