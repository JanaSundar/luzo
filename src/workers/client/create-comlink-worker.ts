import * as Comlink from "comlink";

export interface WorkerClient<T> {
  callLatest<R>(key: string, invoke: (api: Comlink.Remote<T>) => Promise<R>): Promise<R | null>;
  dispose(): Promise<void>;
  get(): Promise<Comlink.Remote<T>>;
}

export function createComlinkWorker<T>(factory: () => Worker): WorkerClient<T> {
  let worker: Worker | null = null;
  let api: Comlink.Remote<T> | null = null;
  const sequences = new Map<string, number>();

  return {
    async get(): Promise<Comlink.Remote<T>> {
      if (!worker) worker = factory();
      if (!api) api = Comlink.wrap<T>(worker);
      return api;
    },
    async callLatest<R>(
      key: string,
      invoke: (remote: Comlink.Remote<T>) => Promise<R>,
    ): Promise<R | null> {
      const current = (sequences.get(key) ?? 0) + 1;
      sequences.set(key, current);

      const remote = await this.get();
      const result = await invoke(remote);

      return current === sequences.get(key) ? result : null;
    },
    async dispose() {
      sequences.clear();
      worker?.terminate();
      worker = null;
      api = null;
    },
  };
}
