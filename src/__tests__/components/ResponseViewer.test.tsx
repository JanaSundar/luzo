import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createJSONStorage } from "zustand/middleware";
import { ResponseViewer } from "@/components/playground/ResponseViewer";
import { useExecutionStore } from "@/lib/stores/useExecutionStore";
import { render } from "@/test/utils";

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
    clear: () => store.clear(),
  };
})();

function setMockResponse(overrides = {}) {
  useExecutionStore.getState().setPlaygroundResponse({
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    body: '{"name":"John","age":30}',
    time: 120,
    size: 23,
    ...overrides,
  });
  useExecutionStore.getState().setLoading(false);
}

describe("ResponseViewer", () => {
  beforeEach(() => {
    useExecutionStore.persist.setOptions({
      storage: createJSONStorage(() => memoryStorage),
    });
    memoryStorage.clear();
    useExecutionStore.getState().setPlaygroundResponse(null);
    useExecutionStore.getState().setLoading(false);
  });

  it("shows empty state when no response", () => {
    useExecutionStore.getState().setPlaygroundResponse(null);
    useExecutionStore.getState().setLoading(false);
    render(<ResponseViewer />);
    expect(screen.getByText(/No response yet/i)).toBeInTheDocument();
  });

  it("shows loading spinner when loading", () => {
    useExecutionStore.getState().setPlaygroundResponse(null);
    useExecutionStore.getState().setLoading(true);
    render(<ResponseViewer />);
    expect(screen.getByText(/loading response/i)).toBeInTheDocument();
  });

  it("shows 200 status badge for successful response", () => {
    setMockResponse({ status: 200 });
    render(<ResponseViewer />);
    expect(screen.getByText(/200 OK/i)).toBeInTheDocument();
  });

  it("shows 404 status badge", () => {
    setMockResponse({ status: 404, statusText: "Not Found" });
    render(<ResponseViewer />);
    expect(screen.getByText(/404 Not Found/i)).toBeInTheDocument();
  });

  it("shows response time", () => {
    setMockResponse({ time: 120 });
    render(<ResponseViewer />);
    expect(screen.getByText(/120ms/)).toBeInTheDocument();
  });

  it("shows formatted JSON body", () => {
    setMockResponse({ body: '{"name":"John","age":30}' });
    render(<ResponseViewer />);
    expect(screen.getByText(/John/)).toBeInTheDocument();
  });

  it("shows response headers tab", () => {
    setMockResponse();
    render(<ResponseViewer />);
    expect(screen.getByRole("tab", { name: /headers/i })).toBeInTheDocument();
  });
});
