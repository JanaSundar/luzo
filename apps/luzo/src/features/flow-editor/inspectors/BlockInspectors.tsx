"use client";

import type { ReactNode } from "react";
import type {
  DelayNode,
  DisplayNode,
  EndNode,
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
import { FlowInspectorCard, InspectorField, InspectorHint } from "./InspectorChrome";

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

export function DelayInspector({
  api,
  node,
}: {
  api: { onUpdate: (nodeId: string, patch: Record<string, unknown>) => void };
  node: DelayNode;
}) {
  const durationMs = node.data.durationMs ?? 1000;

  return (
    <FlowInspectorCard eyebrow="Flow control" title="Delay block" summary={`${durationMs}ms`}>
      <Input
        aria-label="Delay label"
        value={node.data.label ?? ""}
        onChange={(event) => api.onUpdate(node.id, { label: event.target.value })}
      />
      <InspectorField label="Duration" hint="Milliseconds">
        <Input
          aria-label="Duration (ms)"
          type="number"
          min={0}
          step={100}
          value={String(durationMs)}
          onChange={(event) =>
            api.onUpdate(node.id, { durationMs: Math.max(0, Number(event.target.value) || 0) })
          }
        />
      </InspectorField>
      <InspectorHint>
        Pauses execution for the specified duration (milliseconds) before continuing to the next
        node.
      </InspectorHint>
    </FlowInspectorCard>
  );
}

export function EndInspector({
  api,
  node,
}: {
  api: { onUpdate: (nodeId: string, patch: Record<string, unknown>) => void };
  node: EndNode;
}) {
  return (
    <InspectorSection eyebrow="Terminal" title="End block">
      <Input
        aria-label="End label"
        value={node.data.label ?? "End"}
        onChange={(event) => api.onUpdate(node.id, { label: event.target.value })}
      />
      <p className="text-xs leading-5 text-muted-foreground">
        Marks the end of a flow path. No-op at runtime — purely a visual terminator.
      </p>
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
