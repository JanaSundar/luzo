import type { StateStorage } from "zustand/middleware";
import { deleteIndexedDbValue, getIndexedDbValue, setIndexedDbValue } from "./indexeddb-kv";

interface IndexedDbStorageOptions {
  dbName?: string;
  storeName?: string;
}

export function createIndexedDbStorage(options: IndexedDbStorageOptions = {}): StateStorage {
  return {
    getItem: async (name) => {
      const value = await getIndexedDbValue<string>(name, options);
      return value ?? null;
    },
    setItem: async (name, value) => {
      await setIndexedDbValue(name, value, options);
    },
    removeItem: async (name) => {
      await deleteIndexedDbValue(name, options);
    },
  };
}
