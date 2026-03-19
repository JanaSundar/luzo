import { beforeEach, describe, expect, it } from "vitest";
import { createJSONStorage } from "zustand/middleware";
import { useCollectionStore } from "@/lib/stores/useCollectionStore";
import { useDbStore } from "@/lib/stores/useDbStore";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";

const memoryStorage = (() => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
})();

describe("usePlaygroundStore", () => {
  beforeEach(() => {
    usePlaygroundStore.persist.setOptions({
      storage: createJSONStorage(() => memoryStorage),
    });
    memoryStorage.clear();
    usePlaygroundStore.setState({
      request: {
        method: "GET",
        url: "",
        headers: [],
        params: [],
        body: null,
        bodyType: "none",
        auth: { type: "none" },
      },
      response: null,
      isLoading: false,
      environments: [{ id: "default", name: "Default", variables: [] }],
      activeEnvironmentId: "default",
    });
  });

  it("updates method", () => {
    usePlaygroundStore.getState().setMethod("POST");
    expect(usePlaygroundStore.getState().request.method).toBe("POST");
  });

  it("updates url", () => {
    usePlaygroundStore.getState().setUrl("https://api.example.com");
    expect(usePlaygroundStore.getState().request.url).toBe("https://api.example.com");
  });

  it("sets loading state", () => {
    usePlaygroundStore.getState().setLoading(true);
    expect(usePlaygroundStore.getState().isLoading).toBe(true);
  });

  it("resets request", () => {
    usePlaygroundStore.getState().setUrl("https://api.example.com");
    usePlaygroundStore.getState().resetRequest();
    expect(usePlaygroundStore.getState().request.url).toBe("");
  });

  it("adds environment", () => {
    usePlaygroundStore.getState().addEnvironment("Production");
    const envs = usePlaygroundStore.getState().environments;
    expect(envs.find((e) => e.name === "Production")).toBeDefined();
  });

  it("interpolates environment variables", () => {
    const store = usePlaygroundStore.getState();
    store.updateEnvironmentVariable("default", "baseUrl", "https://api.example.com");
    const vars = store.getActiveEnvironmentVariables();
    expect(vars.baseUrl).toBe("https://api.example.com");
  });
});

describe("useCollectionStore", () => {
  beforeEach(() => {
    useCollectionStore.setState({ history: [] });
  });

  it("adds to history on request sent", () => {
    useCollectionStore.getState().addToHistory("GET users", {
      method: "GET",
      url: "https://api.example.com/users",
      headers: [],
      params: [],
      body: null,
      bodyType: "none",
      auth: { type: "none" },
    });
    const [entry] = useCollectionStore.getState().history;
    expect(useCollectionStore.getState().history).toHaveLength(1);
    expect(entry.name).toBe("GET users");
    expect(entry.createdAt).toBeTruthy();
    expect(entry.updatedAt).toBe(entry.createdAt);
  });

  it("limits history to 100 items", () => {
    for (let i = 0; i < 105; i++) {
      useCollectionStore.getState().addToHistory(`Request ${i}`, {
        method: "GET",
        url: `https://api.example.com/${i}`,
        headers: [],
        params: [],
        body: null,
        bodyType: "none",
        auth: { type: "none" },
      });
    }
    expect(useCollectionStore.getState().history.length).toBeLessThanOrEqual(100);
    expect(useCollectionStore.getState().history[0]?.name).toBe("Request 104");
  });

  it("clears history", () => {
    useCollectionStore.getState().addToHistory("test", {
      method: "GET",
      url: "https://api.example.com",
      headers: [],
      params: [],
      body: null,
      bodyType: "none",
      auth: { type: "none" },
    });
    useCollectionStore.getState().clearHistory();
    expect(useCollectionStore.getState().history).toHaveLength(0);
  });
});

describe("useDbStore", () => {
  beforeEach(() => {
    useDbStore.setState({
      dbUrl: "",
      status: "disconnected",
      error: null,
      latencyMs: null,
      schemaReady: false,
      warnings: [],
      tables: [],
    });
  });

  it("clears the stored db url on disconnect", () => {
    useDbStore.setState({
      dbUrl: "postgres://example",
      status: "connected",
    });

    useDbStore.getState().disconnect();

    expect(useDbStore.getState().dbUrl).toBe("");
    expect(useDbStore.getState().status).toBe("disconnected");
  });
});
