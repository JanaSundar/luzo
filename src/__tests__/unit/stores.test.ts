import { beforeEach, describe, expect, it } from "vitest";
import { useCollectionStore } from "@/lib/stores/useCollectionStore";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";

describe("usePlaygroundStore", () => {
  beforeEach(() => {
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
    useCollectionStore.setState({ collections: [], history: [] });
  });

  it("creates a collection", () => {
    useCollectionStore.getState().createCollection("My API");
    expect(useCollectionStore.getState().collections).toHaveLength(1);
    expect(useCollectionStore.getState().collections[0].name).toBe("My API");
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
    expect(useCollectionStore.getState().history).toHaveLength(1);
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
