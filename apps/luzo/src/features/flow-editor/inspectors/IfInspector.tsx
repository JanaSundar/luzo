"use client";

import type { IfNode } from "@luzo/flow-types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

import { Input } from "@/components/ui/input";
import { ExpressionInput } from "./ExpressionInput";
import { FlowInspectorCard, InspectorField, InspectorHint } from "./InspectorChrome";

interface IfInspectorProps {
  api: { onUpdate: (nodeId: string, patch: Record<string, unknown>) => void };
  node: IfNode;
  suggestions?: VariableSuggestion[];
}

/**
 * Dedicated inspector for the If node (Phase 1 branching node).
 * Uses the same expression-based evaluation as the condition executor.
 * Maps to `condition` workflow kind at the plan layer — zero runtime changes needed.
 */
export function IfInspector({ api, node, suggestions = [] }: IfInspectorProps) {
  const expressionSuggestions = suggestions.map((suggestion) =>
    suggestion.type === "env"
      ? { ...suggestion, label: `${suggestion.label} via env`, path: `env.${suggestion.path}` }
      : suggestion,
  );

  return (
    <FlowInspectorCard eyebrow="Logic" title="If block">
      <Input
        aria-label="If label"
        value={node.data.label ?? ""}
        onChange={(event) => api.onUpdate(node.id, { label: event.target.value })}
      />
      <InspectorField label="Expression" hint="Returns boolean">
        <ExpressionInput
          ariaLabel="If expression"
          placeholder="req1.response.body.status === 'active'"
          suggestions={expressionSuggestions}
          value={node.data.expression ?? ""}
          onChange={(expression) => api.onUpdate(node.id, { expression })}
        />
      </InspectorField>
      <InspectorHint>
        Returns <span className="font-mono text-foreground">true</span> or{" "}
        <span className="font-mono text-foreground">false</span>. Type request aliases like{" "}
        <span className="font-mono text-foreground">req1.response.body.id</span>.
      </InspectorHint>
    </FlowInspectorCard>
  );
}
