import { createStore, del, get, set } from "idb-keyval";

const DEFAULT_DB_NAME = "luzo-state";
const DEFAULT_STORE_NAME = "kv";

interface IndexedDbOptions {
  dbName?: string;
  storeName?: string;
}

const memoryFallback = new Map<string, unknown>();
const storeCache = new Map<string, ReturnType<typeof createStore>>();

function hasIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function getStore(options: IndexedDbOptions = {}) {
  const dbName = options.dbName ?? DEFAULT_DB_NAME;
  const storeName = options.storeName ?? DEFAULT_STORE_NAME;
  const cacheKey = `${dbName}:${storeName}`;
  const cached = storeCache.get(cacheKey);
  if (cached) return cached;

  const store = createStore(dbName, storeName);
  storeCache.set(cacheKey, store);
  return store;
}

export async function getIndexedDbValue<T>(key: string, options: IndexedDbOptions = {}) {
  if (!hasIndexedDb()) {
    return (memoryFallback.get(key) as T | undefined) ?? null;
  }

  try {
    return ((await get(key, getStore(options))) as T | undefined) ?? null;
  } catch {
    return (memoryFallback.get(key) as T | undefined) ?? null;
  }
}

export async function setIndexedDbValue<T>(key: string, value: T, options: IndexedDbOptions = {}) {
  if (!hasIndexedDb()) {
    memoryFallback.set(key, value);
    return;
  }

  try {
    await set(key, value, getStore(options));
  } catch {
    memoryFallback.set(key, value);
  }
}

export async function deleteIndexedDbValue(key: string, options: IndexedDbOptions = {}) {
  if (!hasIndexedDb()) {
    memoryFallback.delete(key);
    return;
  }

  try {
    await del(key, getStore(options));
  } catch {
    memoryFallback.delete(key);
  }
}
