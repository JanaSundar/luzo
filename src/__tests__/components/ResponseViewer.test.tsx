import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResponseViewer } from "@/components/playground/ResponseViewer";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { render } from "@/test/utils";

function setMockResponse(overrides = {}) {
  usePlaygroundStore.setState({
    response: {
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
      body: '{"name":"John","age":30}',
      time: 120,
      size: 23,
      ...overrides,
    },
    isLoading: false,
  });
}

describe("ResponseViewer", () => {
  it("shows empty state when no response", () => {
    usePlaygroundStore.setState({ response: null, isLoading: false });
    render(<ResponseViewer />);
    expect(screen.getByText(/No response yet/i)).toBeInTheDocument();
  });

  it("shows loading spinner when loading", () => {
    usePlaygroundStore.setState({ response: null, isLoading: true });
    render(<ResponseViewer />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
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
