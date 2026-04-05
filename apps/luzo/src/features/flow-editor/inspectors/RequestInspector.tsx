"use client";

import { useMemo, useState } from "react";
import type { RequestNode } from "@luzo/flow-types";
import { Input } from "@/components/ui/input";
import { TemplateInput } from "@/components/ui/template-input";
import { compilePreRequestRules, compileTestRules } from "@/lib/utils/rule-compiler";
import type { HttpMethod } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import type { RequestBlock } from "../domain/types";
import { AuthEditor } from "./request-inspector/AuthEditor";
import { BodyEditor } from "./request-inspector/BodyEditor";
import { KeyValueListEditor } from "./request-inspector/KeyValueListEditor";
import { MockEditor, createMockConfig } from "./request-inspector/MockEditor";
import { ScriptsEditor } from "./request-inspector/ScriptsEditor";
import { EditorTabs, FieldLabel } from "./request-inspector/shared";

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
const EDITOR_TABS = [
  { id: "auth", label: "Auth" },
  { id: "params", label: "Params" },
  { id: "headers", label: "Headers" },
  { id: "body", label: "Body" },
  { id: "scripts", label: "Scripts" },
  { id: "mock", label: "Mock" },
] as const;

type EditorTab = (typeof EDITOR_TABS)[number]["id"];

export function RequestInspector({
  api,
  block,
  node,
  suggestions,
}: {
  api: { onUpdate: (nodeId: string, patch: Record<string, unknown>) => void; readOnly: boolean };
  block?: RequestBlock;
  node: RequestNode;
  suggestions: VariableSuggestion[];
}) {
  const [activeTab, setActiveTab] = useState<EditorTab>("params");
  const value = block?.data;

  const summary = useMemo(
    () => [
      `${value?.params.filter((param) => param.enabled && param.key).length ?? 0} params`,
      `${value?.headers.filter((header) => header.enabled && header.key).length ?? 0} headers`,
      `Body ${value?.bodyType ?? "none"}`,
    ],
    [value],
  );

  if (!value) {
    return <div className="px-1 py-4 text-sm text-muted-foreground">Request unavailable.</div>;
  }

  const compiledPreRequestScript =
    value.preRequestEditorType === "visual" && !value.preRequestScript?.trim()
      ? compilePreRequestRules(value.preRequestRules)
      : (value.preRequestScript ?? "");
  const compiledTestScript =
    value.testEditorType === "visual" && !value.testScript?.trim()
      ? compileTestRules(value.testRules)
      : (value.testScript ?? "");
  const hasVisualRules =
    (value.preRequestEditorType === "visual" && (value.preRequestRules?.length ?? 0) > 0) ||
    (value.testEditorType === "visual" && (value.testRules?.length ?? 0) > 0);

  return (
    <div data-flow-editable="true" className="flex min-w-0 flex-col gap-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
            Request Node
          </p>
          <p className="text-sm text-muted-foreground">
            A plain request editor tuned for the canvas inspector.
          </p>
        </div>

        <div className="space-y-3">
          <FieldLabel htmlFor={`request-name-${node.id}`}>Name</FieldLabel>
          <Input
            id={`request-name-${node.id}`}
            aria-label="Request name"
            className="h-10 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 text-base shadow-none focus-visible:border-foreground/30 focus-visible:bg-transparent"
            disabled={api.readOnly}
            placeholder="Request name"
            value={value.name}
            onChange={(event) => api.onUpdate(node.id, { name: event.target.value })}
          />
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
          <RequestMethodField
            disabled={api.readOnly}
            method={value.method}
            onChange={(method) => api.onUpdate(node.id, { method })}
          />
          <div className="space-y-2 min-w-0">
            <FieldLabel htmlFor={`request-url-${node.id}`}>URL</FieldLabel>
            <TemplateInput
              id={`request-url-${node.id}`}
              aria-label="Request URL"
              disabled={api.readOnly}
              inputClassName="h-10 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 font-mono text-sm shadow-none focus-visible:border-foreground/30 focus-visible:bg-transparent"
              overlayClassName="h-10 px-0 text-sm"
              placeholder="https://api.example.com/resource"
              suggestions={suggestions}
              value={value.url}
              onChange={(url) => api.onUpdate(node.id, { url })}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/80">
          {summary.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>

      <div className="border-b border-border/50" />

      <div className="space-y-5 min-w-0">
        <EditorTabs
          activeTab={activeTab}
          tabs={EDITOR_TABS}
          onSelect={(tab) => setActiveTab(tab as EditorTab)}
        />

        {activeTab === "auth" ? (
          <AuthEditor
            auth={value.auth}
            disabled={api.readOnly}
            suggestions={suggestions}
            onChange={(auth) => api.onUpdate(node.id, { auth })}
          />
        ) : null}

        {activeTab === "params" ? (
          <KeyValueListEditor
            addLabel="Add parameter"
            disabled={api.readOnly}
            emptyText="No query parameters yet."
            items={value.params}
            keyPlaceholder="page"
            suggestions={suggestions}
            title="Query Parameters"
            valuePlaceholder="1"
            onChange={(params) => api.onUpdate(node.id, { params })}
          />
        ) : null}

        {activeTab === "headers" ? (
          <KeyValueListEditor
            addLabel="Add header"
            disabled={api.readOnly}
            emptyText="No headers yet."
            items={value.headers}
            keyPlaceholder="Authorization"
            suggestions={suggestions}
            title="Headers"
            valuePlaceholder="Bearer {{token}}"
            onChange={(headers) => api.onUpdate(node.id, { headers })}
          />
        ) : null}

        {activeTab === "body" ? (
          <BodyEditor
            body={value.body}
            bodyLocked={value.method === "GET" || value.method === "HEAD"}
            bodyType={value.bodyType}
            disabled={api.readOnly}
            formDataFields={value.formDataFields ?? []}
            suggestions={suggestions}
            onChange={(patch) => api.onUpdate(node.id, patch)}
          />
        ) : null}

        {activeTab === "scripts" ? (
          <ScriptsEditor
            disabled={api.readOnly}
            hasVisualRules={hasVisualRules}
            preRequestScript={compiledPreRequestScript}
            suggestions={suggestions}
            testScript={compiledTestScript}
            onChange={(patch) => api.onUpdate(node.id, patch)}
          />
        ) : null}

        {activeTab === "mock" ? (
          <MockEditor
            config={createMockConfig(value.mockConfig)}
            disabled={api.readOnly}
            suggestions={suggestions}
            onChange={(mockConfig) => api.onUpdate(node.id, { mockConfig })}
          />
        ) : null}
      </div>
    </div>
  );
}

function RequestMethodField({
  disabled,
  method,
  onChange,
}: {
  disabled: boolean;
  method: HttpMethod;
  onChange: (method: HttpMethod) => void;
}) {
  return (
    <div className="space-y-2 min-w-0">
      <FieldLabel>Method</FieldLabel>
      <select
        aria-label="HTTP method"
        className="h-10 w-full rounded-none border-0 border-b border-border bg-transparent px-0 text-sm shadow-none outline-none focus:border-foreground/30"
        disabled={disabled}
        value={method}
        onChange={(event) => onChange(event.target.value as HttpMethod)}
      >
        {HTTP_METHODS.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}
