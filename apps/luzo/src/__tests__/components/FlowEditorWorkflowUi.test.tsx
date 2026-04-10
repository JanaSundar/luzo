import { FirstPartyNodeCard } from "@luzo/flow-builder";
import { describe, expect, it, vi } from "vitest";
import { FLOW_EDITOR_SUGGESTION_SECTIONS } from "@/features/flow-editor/FlowEditorPage";
import { createLuzoBlockRegistry } from "@/features/flow-editor/blockDefs";
import { DelayInspector } from "@/features/flow-editor/inspectors/BlockInspectors";
import { IfInspector } from "@/features/flow-editor/inspectors/IfInspector";
import { PollInspector } from "@/features/flow-editor/inspectors/PollInspector";
import {
  ForEachInspector,
  WebhookWaitInspector,
} from "@/features/flow-editor/inspectors/WorkflowInspectors";
import { render, screen } from "@/utils/test-utils";

const api = { onUpdate: vi.fn() };

describe("Flow editor workflow UI", () => {
  it("removes join from suggestion surfaces and block registry", () => {
    const registry = createLuzoBlockRegistry(new Map());
    const suggestionLabels = FLOW_EDITOR_SUGGESTION_SECTIONS.flatMap((section) =>
      section.items.map((item) => item.label),
    );

    expect(registry.join).toBeUndefined();
    expect(suggestionLabels).not.toContain("Join");
  });

  it("renders the redesigned if inspector", () => {
    render(
      <IfInspector
        api={api}
        node={{
          id: "if-1",
          type: "if",
          position: { x: 0, y: 0 },
          data: { label: "If", expression: "" },
        }}
        suggestions={[]}
      />,
    );

    expect(screen.getByText("If block")).toBeInTheDocument();
    expect(screen.getByLabelText("If expression")).toBeInTheDocument();
  });

  it("renders the redesigned delay and poll inspectors", () => {
    render(
      <>
        <DelayInspector
          api={api}
          node={{
            id: "delay-1",
            type: "delay",
            position: { x: 0, y: 0 },
            data: { label: "Delay", durationMs: 3000 },
          }}
        />
        <PollInspector
          api={api}
          node={{
            id: "poll-1",
            type: "poll",
            position: { x: 0, y: 0 },
            data: { label: "Poll", stopCondition: "ready", intervalMs: 2000, maxAttempts: 8 },
          }}
          suggestions={[]}
        />
      </>,
    );

    expect(screen.getByText("Delay block")).toBeInTheDocument();
    expect(screen.getByText("Poll block")).toBeInTheDocument();
    expect(screen.getByLabelText("Duration (ms)")).toBeInTheDocument();
    expect(screen.getByLabelText("Max attempts")).toBeInTheDocument();
  });

  it("renders the redesigned foreach and webhook wait inspectors", () => {
    render(
      <>
        <ForEachInspector
          api={api}
          node={{
            id: "for-1",
            type: "forEach",
            position: { x: 0, y: 0 },
            data: { label: "For Each", collectionPath: "req1.items", mapExpression: "" },
          }}
          suggestions={[]}
        />
        <WebhookWaitInspector
          api={api}
          node={{
            id: "wait-1",
            type: "webhookWait",
            position: { x: 0, y: 0 },
            data: { label: "Webhook Wait", timeoutMs: 300000, correlationKey: "" },
          }}
        />
      </>,
    );

    expect(screen.getByText("ForEach block")).toBeInTheDocument();
    expect(screen.getByText("Webhook Wait block")).toBeInTheDocument();
    expect(screen.getByLabelText("Collection path")).toBeInTheDocument();
    expect(screen.getByLabelText("Correlation key")).toBeInTheDocument();
  });

  it("renders the redesigned node cards", () => {
    render(
      <>
        <FirstPartyNodeCard
          node={{
            id: "if-1",
            type: "if",
            position: { x: 0, y: 0 },
            data: { label: "If", expression: "req1.ok", hasFalseBranch: true },
          }}
        />
        <FirstPartyNodeCard
          node={{
            id: "delay-1",
            type: "delay",
            position: { x: 0, y: 0 },
            data: { label: "Delay", durationMs: 5000 },
          }}
        />
      </>,
    );

    expect(screen.getByText("True")).toBeInTheDocument();
    expect(screen.getByText("False")).toBeInTheDocument();
    expect(screen.getByText("Pause")).toBeInTheDocument();
    expect(screen.getByText("5s")).toBeInTheDocument();
  });
});
