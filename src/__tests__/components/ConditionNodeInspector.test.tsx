import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConditionNodeInspector } from "@/features/pipelines/components/ConditionNodeInspector";
import { render } from "@/utils/test-utils";
import type { ConditionNodeConfig } from "@/types/workflow";
import type { VariableSuggestion } from "@/types/pipeline-debug";

function ConditionHarness({
  suggestions,
  onTrueTargetChange = vi.fn(),
  onFalseTargetChange = vi.fn(),
  trueTarget = "step-2",
  falseTarget = "step-3",
}: {
  suggestions: VariableSuggestion[];
  onTrueTargetChange?: (targetId: string | null) => void;
  onFalseTargetChange?: (targetId: string | null) => void;
  trueTarget?: string | null;
  falseTarget?: string | null;
}) {
  const [config, setConfig] = useState<ConditionNodeConfig>({
    kind: "condition",
    label: "Check status",
    expression: "",
    rules: [
      {
        id: "rule-1",
        valueRef: "",
        operator: "equals",
        value: "200",
      },
    ],
  });

  return (
    <ConditionNodeInspector
      config={config}
      suggestions={suggestions}
      routeOptions={[
        {
          stepId: "step-2",
          stepIndex: 1,
          label: "Fetch profile",
          subtitle: "https://api.example.com/profile",
          detail: "Request 2",
          method: "GET",
        },
        {
          stepId: "step-3",
          stepIndex: 2,
          label: "Create fallback",
          subtitle: "https://api.example.com/fallback",
          detail: "Request 3",
          method: "POST",
        },
      ]}
      trueTarget={trueTarget}
      falseTarget={falseTarget}
      onChange={setConfig}
      onTrueTargetChange={onTrueTargetChange}
      onFalseTargetChange={onFalseTargetChange}
    />
  );
}

describe("ConditionNodeInspector", () => {
  it("uses inferred suggestions for condition variable inputs", async () => {
    const user = userEvent.setup();

    render(
      <ConditionHarness
        suggestions={[
          {
            path: "req1.response.status",
            label: "Request 1 -> Status Code",
            stepId: "step-1",
            type: "status",
          },
        ]}
      />,
    );

    const input = screen.getByLabelText("Condition variable 1");
    await user.type(input, "status");
    expect(await screen.findByText("req1.response.status")).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");

    expect(input).toHaveValue("req1.response.status");
  });

  it("shows the connected true and false paths", () => {
    render(<ConditionHarness suggestions={[]} />);

    expect(screen.getByText("→ Fetch profile")).toBeInTheDocument();
    expect(screen.getByText("→ Create fallback")).toBeInTheDocument();
  });

  it("uses none as the empty route option label", async () => {
    render(<ConditionHarness suggestions={[]} trueTarget={null} />);

    expect(screen.getByRole("combobox", { name: /true path/i })).toHaveTextContent("none");
  });
});
