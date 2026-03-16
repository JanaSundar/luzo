import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

describe("RequestBuilder", () => {
  it("renders method selector with all HTTP methods", () => {
    render(<RequestBuilder />);
    expect(screen.getByRole("combobox", { name: /HTTP Method/i })).toBeInTheDocument();
  });

  it("renders URL input", () => {
    render(<RequestBuilder />);
    expect(screen.getByPlaceholderText(/Enter URL or \{\{variable\}\}\/path/i)).toBeInTheDocument();
  });

  it("updates URL when input changes", () => {
    render(<RequestBuilder />);
    const input = screen.getByPlaceholderText(/Enter URL or \{\{variable\}\}\/path/i);
    fireEvent.change(input, { target: { value: "https://api.example.com/users" } });
    expect(input).toHaveValue("https://api.example.com/users");
  });

  it("disables send button when URL is empty", () => {
    usePlaygroundStore.setState((s) => ({ request: { ...s.request, url: "" } }));
    render(<RequestBuilder />);
    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it("enables send button when URL is provided", () => {
    usePlaygroundStore.setState((s) => ({
      request: { ...s.request, url: "https://api.example.com" },
    }));
    render(<RequestBuilder />);
    const sendButton = screen.getByRole("button", { name: /send/i });
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
    render(<RequestBuilder />);
    fireEvent.click(screen.getByRole("tab", { name: /headers/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText(/header/i).length).toBeGreaterThan(0);
    });
  });
});
