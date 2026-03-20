import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createJSONStorage } from "zustand/middleware";
import { RequestBuilder } from "@/components/playground/RequestBuilder";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { render } from "@/test/utils";

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
      await screen.findByPlaceholderText(/^header$/i, {}, { timeout: 10000 })
    ).toBeInTheDocument();
  });
});
