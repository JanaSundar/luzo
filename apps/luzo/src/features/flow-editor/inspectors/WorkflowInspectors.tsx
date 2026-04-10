"use client";

import type {
  AssertNode,
  ForEachNode,
  LogNode,
  TransformNode,
  WebhookWaitNode,
} from "@luzo/flow-types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExpressionInput } from "./ExpressionInput";
import { FlowInspectorCard, InspectorField, InspectorHint } from "./InspectorChrome";

type InspectorApi = { onUpdate: (nodeId: string, patch: Record<string, unknown>) => void };

export function ForEachInspector({
  api,
  node,
  suggestions = [],
}: {
  api: InspectorApi;
  node: ForEachNode;
  suggestions?: VariableSuggestion[];
}) {
  return (
    <FlowInspectorCard eyebrow="Iteration" title="ForEach block">
      <Input
        aria-label="ForEach label"
        value={node.data.label ?? ""}
        onChange={(e) => api.onUpdate(node.id, { label: e.target.value })}
      />
      <InspectorField label="Collection path" hint="Array in runtime state">
        <ExpressionInput
          ariaLabel="Collection path"
          placeholder="req1.response.body.items"
          suggestions={suggestions}
          value={node.data.collectionPath ?? ""}
          onChange={(v) => api.onUpdate(node.id, { collectionPath: v })}
        />
      </InspectorField>
      <InspectorField label="Map expression" hint="Optional: item, index">
        <ExpressionInput
          ariaLabel="Map expression"
          placeholder="{ ...item, processed: true }"
          suggestions={[]}
          value={node.data.mapExpression ?? ""}
          onChange={(v) => api.onUpdate(node.id, { mapExpression: v })}
        />
      </InspectorField>
      <InspectorHint>
        Iterates over the collection. Results available as{" "}
        <span className="font-mono text-foreground">loop.results</span> downstream.
      </InspectorHint>
    </FlowInspectorCard>
  );
}

export function TransformInspector({
  api,
  node,
  runtimeRef,
  suggestions = [],
}: {
  api: InspectorApi;
  node: TransformNode;
  runtimeRef?: string | null;
  suggestions?: VariableSuggestion[];
}) {
  void suggestions;
  return (
    <FlowInspectorCard eyebrow="Data" title="Transform block">
      <Input
        aria-label="Transform label"
        value={node.data.label ?? ""}
        onChange={(e) => api.onUpdate(node.id, { label: e.target.value })}
      />
      <InspectorField label="Script" hint="JS expression">
        <Textarea
          aria-label="Transform script"
          placeholder="{ id: req1.response.body.id, name: req1.response.body.name }"
          rows={5}
          value={node.data.script ?? ""}
          onChange={(e) => api.onUpdate(node.id, { script: e.target.value })}
        />
      </InspectorField>
      <InspectorHint>
        Result stored as{" "}
        <span className="font-mono text-foreground">{`${runtimeRef ?? "transform"}.output`}</span>{" "}
        in runtime variables.
      </InspectorHint>
    </FlowInspectorCard>
  );
}

export function LogInspector({
  api,
  node,
  suggestions = [],
}: {
  api: InspectorApi;
  node: LogNode;
  suggestions?: VariableSuggestion[];
}) {
  void suggestions;
  return (
    <FlowInspectorCard eyebrow="Debug" title="Log block">
      <Input
        aria-label="Log label"
        value={node.data.label ?? ""}
        onChange={(e) => api.onUpdate(node.id, { label: e.target.value })}
      />
      <InspectorField label="Message" hint="Supports {{variable}}">
        <Input
          aria-label="Log message"
          placeholder="Auth token received: {{req1.response.body.token}}"
          value={node.data.message ?? ""}
          onChange={(e) => api.onUpdate(node.id, { message: e.target.value })}
        />
      </InspectorField>
      <InspectorHint>
        Emits a message to the execution timeline. Supports{" "}
        <span className="font-mono text-foreground">{"{{variable}}"}</span> interpolation.
      </InspectorHint>
    </FlowInspectorCard>
  );
}

export function AssertInspector({
  api,
  node,
  suggestions = [],
}: {
  api: InspectorApi;
  node: AssertNode;
  suggestions?: VariableSuggestion[];
}) {
  return (
    <FlowInspectorCard eyebrow="Validation" title="Assert block">
      <Input
        aria-label="Assert label"
        value={node.data.label ?? ""}
        onChange={(e) => api.onUpdate(node.id, { label: e.target.value })}
      />
      <InspectorField label="Expression" hint="Must be truthy">
        <ExpressionInput
          ariaLabel="Assert expression"
          placeholder="req1.response.body.status === 'active'"
          suggestions={suggestions}
          value={node.data.expression ?? ""}
          onChange={(v) => api.onUpdate(node.id, { expression: v })}
        />
      </InspectorField>
      <Input
        aria-label="Failure message"
        placeholder="Custom failure message (optional)"
        value={node.data.message ?? ""}
        onChange={(e) => api.onUpdate(node.id, { message: e.target.value })}
      />
      <InspectorHint>Halts the pipeline if the expression evaluates to false.</InspectorHint>
    </FlowInspectorCard>
  );
}

export function WebhookWaitInspector({
  api,
  node,
  runtimeRef,
}: {
  api: InspectorApi;
  node: WebhookWaitNode;
  runtimeRef?: string | null;
}) {
  return (
    <FlowInspectorCard eyebrow="Async" title="Webhook Wait block">
      <Input
        aria-label="Webhook Wait label"
        value={node.data.label ?? ""}
        onChange={(e) => api.onUpdate(node.id, { label: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <InspectorField label="Correlation key" hint="Optional">
          <Input
            aria-label="Correlation key"
            placeholder="request.id"
            value={node.data.correlationKey ?? ""}
            onChange={(e) => api.onUpdate(node.id, { correlationKey: e.target.value })}
          />
        </InspectorField>
        <InspectorField label="Timeout" hint="Milliseconds">
          <Input
            aria-label="Timeout (ms)"
            type="number"
            min={0}
            step={1000}
            value={String(node.data.timeoutMs ?? 300000)}
            onChange={(e) =>
              api.onUpdate(node.id, { timeoutMs: Math.max(0, Number(e.target.value) || 0) })
            }
          />
        </InspectorField>
      </div>
      <InspectorHint>
        Pauses the workflow until an external webhook is received. The endpoint URL is available as{" "}
        <span className="font-mono text-foreground">{`${runtimeRef ?? "webhook"}.webhookUrl`}</span>{" "}
        and the matched payload as{" "}
        <span className="font-mono text-foreground">{`${runtimeRef ?? "webhook"}.output`}</span>.
      </InspectorHint>
    </FlowInspectorCard>
  );
}
