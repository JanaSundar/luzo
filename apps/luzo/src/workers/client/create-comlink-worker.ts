"use client";

import * as Comlink from "comlink";

export interface WorkerClient<T> {
  callLatest<R>(key: string, invoke: (api: T) => Promise<R>): Promise<R | null>;
  dispose(): Promise<void>;
  get(): Promise<T>;
}

interface CreateWorkerClientOptions<T> {
  createWorker: () => Worker;
  loadApi?: () => Promise<T>;
}

export function createComlinkWorker<T>({
  createWorker,
  loadApi,
}: CreateWorkerClientOptions<T>): WorkerClient<T> {
  let apiPromise: Promise<T> | null = null;
  let workerInstance: Worker | null = null;
  const sequences = new Map<string, number>();

  return {
    async get(): Promise<T> {
      if (!apiPromise) {
        apiPromise = (async () => {
          const canUseWorker = typeof window !== "undefined" && typeof Worker !== "undefined";
          if (canUseWorker) {
            workerInstance = createWorker();
            return Comlink.wrap<T>(workerInstance) as T;
          }
          if (!loadApi) {
            throw new Error("Worker API is unavailable in this environment");
          }
          return loadApi();
        })();
      }
      return apiPromise;
    },
    async callLatest<R>(key: string, invoke: (remote: T) => Promise<R>): Promise<R | null> {
      const current = (sequences.get(key) ?? 0) + 1;
      sequences.set(key, current);

      const remote = await this.get();
      const result = await invoke(remote);

      return current === sequences.get(key) ? result : null;
    },
    async dispose() {
      sequences.clear();
      const remote = apiPromise ? await apiPromise : null;
      if (remote && typeof remote === "object") {
        try {
          const releasable = remote as Comlink.Remote<T> & {
            [Comlink.releaseProxy]?: () => void;
          };
          releasable[Comlink.releaseProxy]?.();
        } catch {}
      }
      workerInstance?.terminate();
      workerInstance = null;
      apiPromise = null;
    },
  };
}
