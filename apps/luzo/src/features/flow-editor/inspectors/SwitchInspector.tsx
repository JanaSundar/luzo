"use client";

import { Plus, Trash2 } from "lucide-react";
import type { SwitchNode } from "@luzo/flow-types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExpressionInput } from "./ExpressionInput";
import { FlowInspectorCard, InspectorField, InspectorHint } from "./InspectorChrome";

interface SwitchInspectorProps {
  api: { onUpdate: (nodeId: string, patch: Record<string, unknown>) => void };
  node: SwitchNode;
  suggestions?: VariableSuggestion[];
}

export function SwitchInspector({ api, node, suggestions = [] }: SwitchInspectorProps) {
  const cases = node.data.cases ?? [];

  const expressionSuggestions = suggestions.map((s) =>
    s.type === "env" ? { ...s, label: `${s.label} via env`, path: `env.${s.path}` } : s,
  );

  function updateCase(id: string, patch: Partial<(typeof cases)[number]>) {
    api.onUpdate(node.id, { cases: cases.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  }

  function addCase() {
    const nonDefault = cases.filter((c) => !c.isDefault);
    const newCase = {
      id: `case_${nonDefault.length}`,
      label: `Case ${nonDefault.length + 1}`,
      expression: "",
      isDefault: false,
    };
    const defaultCase = cases.find((c) => c.isDefault);
    const nextCases = [...nonDefault, newCase, ...(defaultCase ? [defaultCase] : [])];
    api.onUpdate(node.id, { cases: nextCases });
  }

  function removeCase(id: string) {
    api.onUpdate(node.id, { cases: cases.filter((c) => c.id !== id) });
  }

  return (
    <FlowInspectorCard eyebrow="Logic" title="Switch block">
      <Input
        aria-label="Switch label"
        value={node.data.label ?? ""}
        onChange={(e) => api.onUpdate(node.id, { label: e.target.value })}
      />
      <div className="grid gap-3">
        {cases.map((c) => (
          <div key={c.id} className="grid gap-2 rounded-xl border border-border/50 p-3">
            <div className="flex items-center gap-2">
              <Input
                aria-label="Case label"
                className="h-7 text-xs"
                value={c.label}
                onChange={(e) => updateCase(c.id, { label: e.target.value })}
              />
              {!c.isDefault && (
                <Button
                  aria-label="Remove case"
                  className="h-7 w-7 shrink-0"
                  size="icon"
                  type="button"
                  variant="ghost"
                  onClick={() => removeCase(c.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
            {!c.isDefault && (
              <InspectorField label="Expression" hint="Truthy → match">
                <ExpressionInput
                  ariaLabel={`${c.label} expression`}
                  placeholder="req1.response.body.status === 'active'"
                  suggestions={expressionSuggestions}
                  value={c.expression}
                  onChange={(expression) => updateCase(c.id, { expression })}
                />
              </InspectorField>
            )}
          </div>
        ))}
      </div>
      <Button
        className="h-8 w-full gap-1.5 text-xs"
        size="sm"
        type="button"
        variant="outline"
        onClick={addCase}
      >
        <Plus className="h-3.5 w-3.5" />
        Add case
      </Button>
      <InspectorHint>
        Cases are evaluated top-to-bottom. The first truthy match wins. The default branch fires
        when no case matches.
      </InspectorHint>
    </FlowInspectorCard>
  );
}
