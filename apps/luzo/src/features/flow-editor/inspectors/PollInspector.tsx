"use client";

import type { PollNode } from "@luzo/flow-types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

import { Input } from "@/components/ui/input";
import { ExpressionInput } from "./ExpressionInput";
import { FlowInspectorCard, InspectorField, InspectorHint } from "./InspectorChrome";

type InspectorApi = { onUpdate: (nodeId: string, patch: Record<string, unknown>) => void };

export function PollInspector({
  api,
  node,
  suggestions = [],
}: {
  api: InspectorApi;
  node: PollNode;
  suggestions?: VariableSuggestion[];
}) {
  return (
    <FlowInspectorCard eyebrow="Control flow" title="Poll block">
      <Input
        aria-label="Poll label"
        value={node.data.label ?? ""}
        onChange={(e) => api.onUpdate(node.id, { label: e.target.value })}
      />
      <InspectorField label="Stop condition" hint="Truthy exits loop">
        <ExpressionInput
          ariaLabel="Stop condition"
          placeholder="req1.response.body.status === 'ready'"
          suggestions={suggestions}
          value={node.data.stopCondition ?? ""}
          onChange={(v) => api.onUpdate(node.id, { stopCondition: v })}
        />
      </InspectorField>
      <div className="grid grid-cols-2 gap-3">
        <InspectorField label="Interval" hint="Milliseconds">
          <Input
            aria-label="Interval (ms)"
            type="number"
            min={100}
            step={500}
            value={String(node.data.intervalMs ?? "")}
            onChange={(e) =>
              api.onUpdate(node.id, {
                intervalMs: e.target.value
                  ? Math.max(100, Number(e.target.value) || 2000)
                  : undefined,
              })
            }
          />
        </InspectorField>
        <InspectorField label="Max attempts" hint="Default 10">
          <Input
            aria-label="Max attempts"
            type="number"
            min={1}
            step={1}
            value={String(node.data.maxAttempts ?? "")}
            onChange={(e) =>
              api.onUpdate(node.id, {
                maxAttempts: e.target.value ? Math.max(1, Number(e.target.value) || 10) : undefined,
              })
            }
          />
        </InspectorField>
      </div>
      <InspectorHint>
        Evaluates the condition on each attempt. Stops when truthy or max attempts is reached.
        Runtime variables are in scope — e.g.{" "}
        <span className="font-mono text-foreground">req1.response.body.status</span>.
      </InspectorHint>
    </FlowInspectorCard>
  );
}
