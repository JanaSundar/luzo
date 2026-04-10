import { beforeEach, describe, expect, it } from "vitest";
import { createJSONStorage } from "zustand/middleware";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { usePlaygroundStore } from "@/stores/usePlaygroundStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

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
    usePlaygroundStore.getState().resetRequest();
  });

  it("updates method", () => {
    usePlaygroundStore.getState().setMethod("POST");
    expect(usePlaygroundStore.getState().request.method).toBe("POST");
  });

  it("updates url", () => {
    usePlaygroundStore.getState().setUrl("https://api.example.com");
    expect(usePlaygroundStore.getState().request.url).toBe("https://api.example.com");
  });

  it("resets request", () => {
    usePlaygroundStore.getState().setUrl("https://api.example.com");
    usePlaygroundStore.getState().resetRequest();
    expect(usePlaygroundStore.getState().request.url).toBe("");
  });
});

describe("useHistoryStore", () => {
  const baseRequest = {
    method: "GET" as const,
    url: "https://api.example.com/users",
    headers: [] as { key: string; value: string; enabled: boolean }[],
    params: [] as { key: string; value: string; enabled: boolean }[],
    body: null as string | null,
    bodyType: "none" as const,
    auth: { type: "none" as const },
  };

  beforeEach(() => {
    useHistoryStore.persist.setOptions({
      storage: createJSONStorage(() => memoryStorage),
    });
    memoryStorage.clear();
    useHistoryStore.getState().clearHistory();
  });

  it("adds to history on request sent", () => {
    useHistoryStore.getState().addToHistory("GET users", baseRequest);
    const [entry] = useHistoryStore.getState().history;
    expect(useHistoryStore.getState().history).toHaveLength(1);
    expect(entry?.name).toBe("GET users");
    expect(entry?.createdAt).toBeTruthy();
    expect(entry?.updatedAt).toBe(entry?.createdAt);
  });

  it("updates existing entry when request matches (dedup)", async () => {
    useHistoryStore.getState().addToHistory("GET users", baseRequest);
    const id = useHistoryStore.getState().history[0]?.id;
    const created = useHistoryStore.getState().history[0]?.createdAt;
    await new Promise((r) => setTimeout(r, 2));
    useHistoryStore.getState().addToHistory("GET users renamed", { ...baseRequest });
    expect(useHistoryStore.getState().history).toHaveLength(1);
    expect(useHistoryStore.getState().history[0]?.id).toBe(id);
    expect(useHistoryStore.getState().history[0]?.name).toBe("GET users renamed");
    expect(useHistoryStore.getState().history[0]?.createdAt).toBe(created);
    expect(
      new Date(useHistoryStore.getState().history[0]?.updatedAt ?? "").getTime(),
    ).toBeGreaterThan(new Date(created ?? "").getTime());
  });

  it("appends when url differs", () => {
    useHistoryStore.getState().addToHistory("A", baseRequest);
    useHistoryStore
      .getState()
      .addToHistory("B", { ...baseRequest, url: "https://api.example.com/other" });
    expect(useHistoryStore.getState().history).toHaveLength(2);
  });

  it("limits history to 100 items", () => {
    for (let i = 0; i < 105; i++) {
      useHistoryStore.getState().addToHistory(`Request ${i}`, {
        ...baseRequest,
        url: `https://api.example.com/${i}`,
      });
    }
    expect(useHistoryStore.getState().history.length).toBeLessThanOrEqual(100);
    expect(useHistoryStore.getState().history[0]?.name).toBe("Request 104");
  });

  it("clears history", () => {
    useHistoryStore.getState().addToHistory("test", baseRequest);
    useHistoryStore.getState().clearHistory();
    expect(useHistoryStore.getState().history).toHaveLength(0);
  });

  it("removes one history entry by id", () => {
    useHistoryStore.getState().addToHistory("A", baseRequest);
    const id = useHistoryStore.getState().history[0]?.id;
    expect(id).toBeTruthy();
    useHistoryStore.getState().removeFromHistory(id);
    expect(useHistoryStore.getState().history).toHaveLength(0);
  });
});

describe("useSettingsStore", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      dbUrl: "",
      dbStatus: "disconnected",
      dbError: null,
      dbLatencyMs: null,
      dbSchemaReady: false,
      dbWarnings: [],
      dbTables: [],
    });
  });

  it("clears the stored db url on disconnect", () => {
    useSettingsStore.setState({
      dbUrl: "postgres://example",
      dbStatus: "connected",
    });

    useSettingsStore.getState().setDbUrl("");
    useSettingsStore.getState().setDbStatus({
      dbStatus: "disconnected",
      dbError: null,
      dbLatencyMs: null,
      dbSchemaReady: false,
      dbWarnings: [],
      dbTables: [],
    });

    expect(useSettingsStore.getState().dbUrl).toBe("");
    expect(useSettingsStore.getState().dbStatus).toBe("disconnected");
  });
});
