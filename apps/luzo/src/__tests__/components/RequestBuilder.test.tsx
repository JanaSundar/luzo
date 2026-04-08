import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createJSONStorage } from "zustand/middleware";
import { RequestBuilder } from "@/components/playground/RequestBuilder";
import { usePlaygroundStore } from "@/stores/usePlaygroundStore";
import { render } from "@/utils/test-utils";
import type { ImportWorkerApi } from "@/types/workers";

vi.mock("@/app/actions/api-tests", () => ({
  executeRequest: vi.fn().mockResolvedValue({
    status: 200,
    statusText: "OK",
    headers: {},
    body: '{"success":true}',
    time: 100,
    size: 16,
  }),
}));

vi.mock("@/workers/client/import-client", () => ({
  importWorkerClient: {
    callLatest: vi.fn(async (_key: string, invoke: (api: ImportWorkerApi) => Promise<unknown>) => {
      const api: Partial<ImportWorkerApi> = {
        parseImportSource: vi.fn(async ({ content }: { content: string }) => {
          // For the specific test case in this file:
          if (content.includes("-X POST")) {
            return {
              ok: true as const,
              data: {
                collection: {
                  method: "POST",
                  url: "https://api.example.com/users",
                  params: [{ key: "team", value: "platform", enabled: true }],
                  bodyType: "json",
                  body: '{"name": "Ada"}',
                  headers: [],
                  auth: { type: "none" },
                },
              },
            };
          }
          return {
            ok: false as const,
            error: { code: "invalid_node" as const, message: "Mock Parse Error" },
          };
        }),
      };
      return await invoke(api as ImportWorkerApi);
    }),
  },
}));

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

describe("RequestBuilder", () => {
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
        formDataFields: [],
        auth: { type: "none" },
        preRequestEditorType: "visual",
        testEditorType: "visual",
        preRequestRules: [],
        testRules: [],
      },
    });
  });

  it("renders method selector with all HTTP methods", () => {
    render(<RequestBuilder />);
    expect(screen.getByRole("combobox", { name: /HTTP Method/i })).toBeInTheDocument();
  });

  it("renders URL input", () => {
    render(<RequestBuilder />);
    expect(screen.getByPlaceholderText(/Enter URL/i)).toBeInTheDocument();
  });

  it("updates URL when input changes", () => {
    render(<RequestBuilder />);
    const input = screen.getByPlaceholderText(/Enter URL/i);
    fireEvent.change(input, { target: { value: "https://api.example.com/users" } });
    expect(input).toHaveValue("https://api.example.com/users");
  });

  it("disables send button when URL is empty", () => {
    usePlaygroundStore.setState((s) => ({ request: { ...s.request, url: "" } }));
    render(<RequestBuilder />);
    const sendButton = screen.getByRole("button", { name: /^send$/i });
    expect(sendButton).toBeDisabled();
  });

  it("enables send button when URL is provided", () => {
    usePlaygroundStore.setState((s) => ({
      request: { ...s.request, url: "https://api.example.com" },
    }));
    render(<RequestBuilder />);
    const sendButton = screen.getByRole("button", { name: /^send$/i });
    expect(sendButton).not.toBeDisabled();
  });

  it("renders tabs for params, headers, body, auth", () => {
    render(<RequestBuilder />);
    expect(screen.getByRole("tab", { name: /params/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /headers/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /body/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /auth/i })).toBeInTheDocument();
  });

  it("can add a header", async () => {
    const user = userEvent.setup();
    usePlaygroundStore.setState((s) => ({
      request: {
        ...s.request,
        headers: [{ key: "", value: "", enabled: true }],
      },
    }));
    render(<RequestBuilder />);
    await user.click(screen.getByRole("tab", { name: /headers/i }));

    expect(
      await screen.findByPlaceholderText(/^header$/i, {}, { timeout: 10000 }),
    ).toBeInTheDocument();
  });

  it("imports a curl command into the playground request", async () => {
    const user = userEvent.setup();
    render(<RequestBuilder />);

    await user.click(screen.getByRole("button", { name: /curl/i }));

    fireEvent.change(screen.getByPlaceholderText(/curl 'https:\/\/api\.example\.com\/users'/i), {
      target: {
        value:
          "curl 'https://api.example.com/users?team=platform' -X POST -H 'Content-Type: application/json' --data '{\"name\":\"Ada\"}'",
      },
    });
    await user.click(screen.getByRole("button", { name: /import request/i }));

    await waitFor(() => {
      const state = usePlaygroundStore.getState().request;
      expect(state.method).toBe("POST");
      expect(state.url).toBe("https://api.example.com/users");
      expect(state.params).toEqual([{ key: "team", value: "platform", enabled: true }]);
      expect(state.bodyType).toBe("json");
      expect(state.body).toContain('"name": "Ada"');
    });
  });
});
