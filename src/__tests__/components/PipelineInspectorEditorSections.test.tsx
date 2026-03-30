import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PipelineInspectorEditorSections } from "@/features/pipelines/components/PipelineInspectorEditorSections";
import { render } from "@/utils/test-utils";
import type { PipelineStep } from "@/types";

vi.mock("@/components/playground/KeyValueEditor", () => ({
  KeyValueEditor: ({ placeholder }: { placeholder: string }) => (
    <div>{`${placeholder} editor panel`}</div>
  ),
}));

vi.mock("@/features/request-editor/components/RequestBodyPanel", () => ({
  RequestBodyPanel: () => <div>Body editor panel</div>,
}));

vi.mock("@/features/request-editor/components/RequestAuthPanel", () => ({
  RequestAuthPanel: () => <div>Auth editor panel</div>,
}));

vi.mock("@/features/request-editor/components/RequestScriptsPanel", () => ({
  RequestScriptsPanel: () => <div>Scripts editor panel</div>,
}));

vi.mock("@/features/request-editor/components/RequestAsyncPanel", () => ({
  RequestAsyncPanel: () => <div>Async editor panel</div>,
}));

function createStep(overrides: Partial<PipelineStep> = {}): PipelineStep {
  return {
    id: "step-1",
    name: "Fetch customer",
    method: "POST",
    url: "https://api.example.com/customers",
    headers: [{ key: "x-api-key", value: "secret", enabled: true }],
    params: [
      { key: "include", value: "orders", enabled: true },
      { key: "region", value: "us", enabled: true },
    ],
    body: '{"customerId":"123"}',
    bodyType: "json",
    formDataFields: [],
    auth: { type: "bearer", bearer: { token: "secret" } },
    preRequestEditorType: "visual",
    postRequestEditorType: "visual",
    testEditorType: "visual",
    preRequestRules: [{ id: "pre-1", type: "set_header", key: "x-trace", value: "1" }],
    postRequestRules: [],
    testRules: [{ id: "test-1", target: "status_code", operator: "equals", value: "200" }],
    preRequestScript: "",
    postRequestScript: "",
    testScript: "",
    pollingPolicy: {
      enabled: true,
      intervalMs: 2000,
      maxAttempts: 3,
      timeoutMs: 10000,
      successRules: [],
      failureRules: [],
    },
    webhookWaitPolicy: {
      enabled: false,
      timeoutMs: 60000,
      pollIntervalMs: 2000,
      correlationKeyTemplate: "",
      correlationSource: "body",
      correlationField: "",
    },
    ...overrides,
  };
}

describe("PipelineInspectorEditorSections", () => {
  it("renders request tabs without horizontal scrolling", () => {
    render(
      <PipelineInspectorEditorSections
        section="request"
        step={createStep()}
        suggestions={[]}
        isBodyDisabled={false}
        onChange={vi.fn()}
      />,
    );

    const tablist = screen.getByRole("tablist", { name: /request sections/i });
    expect(tablist.className).not.toContain("overflow-x-auto");

    expect(screen.getByRole("tab", { name: /params/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /headers/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /body/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /auth/i })).toBeInTheDocument();
  });

  it("switches request panels when a user selects a different bento tab", async () => {
    const user = userEvent.setup();

    render(
      <PipelineInspectorEditorSections
        section="request"
        step={createStep()}
        suggestions={[]}
        isBodyDisabled={false}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Parameter editor panel")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /auth/i }));

    expect(screen.getByRole("tab", { name: /auth/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Auth editor panel")).toBeInTheDocument();
    expect(screen.queryByText("Parameter editor panel")).not.toBeInTheDocument();
  });

  it("disables the body tab for GET requests", () => {
    render(
      <PipelineInspectorEditorSections
        section="request"
        step={createStep({ method: "GET", bodyType: "none", body: null })}
        suggestions={[]}
        isBodyDisabled
        onChange={vi.fn()}
      />,
    );

    const bodyTab = screen.getByRole("tab", { name: /body/i });
    expect(bodyTab).toBeDisabled();
  });

  it("renders flow tabs and supports keyboard tab switching", async () => {
    const user = userEvent.setup();

    render(
      <PipelineInspectorEditorSections
        section="flow"
        step={createStep()}
        suggestions={[]}
        isBodyDisabled={false}
        onChange={vi.fn()}
      />,
    );

    const scriptsTab = screen.getByRole("tab", { name: /scripts/i });
    const asyncTab = screen.getByRole("tab", { name: /async controls/i });

    expect(screen.getByText("Scripts editor panel")).toBeInTheDocument();

    scriptsTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(asyncTab).toHaveFocus();
    expect(asyncTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Async editor panel")).toBeInTheDocument();
  });
});
