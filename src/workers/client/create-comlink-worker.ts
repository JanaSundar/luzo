export interface WorkerClient<T> {
  callLatest<R>(key: string, invoke: (api: T) => Promise<R>): Promise<R | null>;
  dispose(): Promise<void>;
  get(): Promise<T>;
}

export function createComlinkWorker<T>(loadApi: () => Promise<T>): WorkerClient<T> {
  let apiPromise: Promise<T> | null = null;
  const sequences = new Map<string, number>();

  return {
    async get(): Promise<T> {
      if (!apiPromise) {
        apiPromise = loadApi();
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
      apiPromise = null;
    },
  };
}
