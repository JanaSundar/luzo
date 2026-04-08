"use client";

import type { ReactNode } from "react";
import type {
  DisplayNode,
  EvaluateNode,
  GroupNode,
  ListNode,
  StartNode,
  TextNode,
} from "@luzo/flow-types";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { ExpressionInput } from "./ExpressionInput";

export function StartInspector({
  api,
  node,
}: {
  api: { onUpdate: (nodeId: string, patch: Record<string, unknown>) => void };
  node: StartNode;
}) {
  return (
    <InspectorSection eyebrow="Entry point" title="Start block">
      <Input
        aria-label="Start label"
        value={node.data.label ?? "Start"}
        onChange={(event) => api.onUpdate(node.id, { label: event.target.value })}
      />
    </InspectorSection>
  );
}

export function EvaluateInspector({
  api,
  node,
  suggestions = [],
}: {
  api: { onUpdate: (nodeId: string, patch: Record<string, unknown>) => void };
  node: EvaluateNode;
  suggestions?: VariableSuggestion[];
}) {
  const expressionSuggestions = suggestions.map((suggestion) =>
    suggestion.type === "env"
      ? {
          ...suggestion,
          label: `${suggestion.label} via env`,
          path: `env.${suggestion.path}`,
        }
      : suggestion,
  );

  return (
    <InspectorSection eyebrow="Logic" title="Evaluate block">
      <Input
        aria-label="Evaluate label"
        value={node.data.label ?? ""}
        onChange={(event) => api.onUpdate(node.id, { label: event.target.value })}
      />
      <Select
        value={node.data.conditionType}
        onValueChange={(conditionType) => api.onUpdate(node.id, { conditionType })}
      >
        <SelectTrigger aria-label="Condition type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="if">If</SelectItem>
          <SelectItem value="switch">Switch</SelectItem>
          <SelectItem value="foreach">For each</SelectItem>
        </SelectContent>
      </Select>
      <ExpressionInput
        ariaLabel="Expression"
        placeholder="req1.response.body.users[0]?.id === 2"
        suggestions={expressionSuggestions}
        value={node.data.expression ?? ""}
        onChange={(expression) => api.onUpdate(node.id, { expression })}
      />
      <p className="text-xs leading-5 text-muted-foreground">
        Type request aliases like{" "}
        <span className="font-mono text-foreground">req1.response.body.id</span> and pick fields
        from autocomplete instead of memorizing response paths.
      </p>
    </InspectorSection>
  );
}

export function ListInspector({
  api,
  node,
}: {
  api: { onUpdate: (nodeId: string, patch: Record<string, unknown>) => void };
  node: ListNode;
}) {
  return (
    <InspectorSection eyebrow="Transform" title="List block">
      <Input
        aria-label="List label"
        value={node.data.label ?? ""}
        onChange={(event) => api.onUpdate(node.id, { label: event.target.value })}
      />
      <Input
        aria-label="Item count"
        type="number"
        value={String(node.data.itemCount ?? 0)}
        onChange={(event) => api.onUpdate(node.id, { itemCount: Number(event.target.value) || 0 })}
      />
    </InspectorSection>
  );
}

export function DisplayInspector({
  api,
  node,
}: {
  api: { onUpdate: (nodeId: string, patch: Record<string, unknown>) => void };
  node: DisplayNode;
}) {
  return (
    <InspectorSection eyebrow="Output" title="Display block">
      <Input
        aria-label="Display label"
        value={node.data.label ?? ""}
        onChange={(event) => api.onUpdate(node.id, { label: event.target.value })}
      />
      <Select
        value={node.data.chartType ?? "table"}
        onValueChange={(chartType) => api.onUpdate(node.id, { chartType })}
      >
        <SelectTrigger aria-label="Chart type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="table">Table</SelectItem>
          <SelectItem value="line">Line</SelectItem>
          <SelectItem value="bar">Bar</SelectItem>
        </SelectContent>
      </Select>
      <Textarea
        aria-label="Display notes"
        placeholder="Add display context"
        rows={6}
        value=""
        readOnly
      />
    </InspectorSection>
  );
}

export function TextInspector({
  api,
  node,
}: {
  api: { onUpdate: (nodeId: string, patch: Record<string, unknown>) => void };
  node: TextNode;
}) {
  return (
    <InspectorSection eyebrow="Notes" title="Text block">
      <Input
        aria-label="Text label"
        value={node.data.label ?? ""}
        onChange={(event) => api.onUpdate(node.id, { label: event.target.value })}
      />
      <Textarea
        aria-label="Text content"
        rows={10}
        value={node.data.content}
        onChange={(event) => api.onUpdate(node.id, { content: event.target.value })}
      />
    </InspectorSection>
  );
}

export function GroupInspector({
  api,
  node,
}: {
  api: { onUpdate: (nodeId: string, patch: Record<string, unknown>) => void };
  node: GroupNode;
}) {
  return (
    <InspectorSection eyebrow="Annotation" title="Group block">
      <Input
        aria-label="Group label"
        value={node.data.label ?? ""}
        onChange={(event) => api.onUpdate(node.id, { label: event.target.value })}
      />
      <Input
        aria-label="Group color"
        value={node.data.color ?? "#dbeafe"}
        onChange={(event) => api.onUpdate(node.id, { color: event.target.value })}
      />
    </InspectorSection>
  );
}

function InspectorSection({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="grid gap-4 rounded-[1.25rem] border border-border/45 bg-background px-4 py-4 shadow-sm">
      <div className="grid gap-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
      </div>
      {children}
    </section>
  );
}
