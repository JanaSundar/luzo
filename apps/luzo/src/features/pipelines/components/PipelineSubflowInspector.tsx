"use client";

import { useMemo, useState } from "react";
import { RequestUrlBar } from "@/components/shared/RequestUrlBar";
import { Button } from "@/components/ui/button";
import { PipelineInspectorEditorSections } from "@/features/pipelines/components/PipelineInspectorEditorSections";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/utils/ui/segmentedTabs";
import type { PipelineStep } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import type { SubflowDefinition, SubflowNodeConfig } from "@/types/workflow";

type SubflowSection = "inputs" | "outputs" | "request" | "details";

export function PipelineSubflowInspector({
  config,
  definition,
  suggestions,
  onChange,
  onRequestChange,
}: {
  config: SubflowNodeConfig;
  definition?: SubflowDefinition;
  suggestions: VariableSuggestion[];
  onChange: (nextConfig: Partial<SubflowNodeConfig>) => void;
  onRequestChange: (requestId: string, nextRequest: Partial<PipelineStep>) => void;
}) {
  const [activeSection, setActiveSection] = useState<SubflowSection>("inputs");
  const inputSchema = definition?.inputSchema ?? [];
  const outputSchema = definition?.outputSchema ?? [];
  const internalRequests = useMemo(
    () => Object.values(definition?.registry.requests ?? {}),
    [definition],
  );
  const internalRequest = internalRequests[0] ?? null;
  const editableRequest = internalRequest as PipelineStep | null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div
        role="tablist"
        aria-label="Subflow inspector sections"
        className="inline-flex w-full max-w-max shrink-0 items-center gap-1 overflow-hidden"
      >
        {(["inputs", "outputs", "request", "details"] as const).map((section) => (
          <button
            key={section}
            type="button"
            role="tab"
            aria-selected={activeSection === section}
            onClick={() => setActiveSection(section)}
            className={segmentedTabTriggerClassName(
              activeSection === section,
              "h-8 shrink-0 justify-center px-3 text-[11px] whitespace-nowrap",
            )}
          >
            {section[0]?.toUpperCase()}
            {section.slice(1)}
          </button>
        ))}
      </div>

      {activeSection === "inputs" ? (
        <div className="space-y-3 overflow-y-auto">
          {inputSchema.length === 0 ? (
            <p className="text-sm text-muted-foreground">This subflow does not require inputs.</p>
          ) : (
            inputSchema.map((input) => (
              <label key={input.key} className="block space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{input.label}</span>
                  {input.required ? (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Required
                    </span>
                  ) : null}
                </div>
                <input
                  value={config.inputBindings[input.key] ?? ""}
                  onChange={(event) =>
                    onChange({
                      inputBindings: {
                        ...config.inputBindings,
                        [input.key]: event.target.value,
                      },
                    })
                  }
                  placeholder={`Binding for ${input.key}`}
                  className="h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
            ))
          )}
        </div>
      ) : null}

      {activeSection === "outputs" ? (
        <div className="space-y-3 overflow-y-auto">
          {outputSchema.map((output) => (
            <label key={output.key} className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">{output.label}</span>
              <input
                value={config.outputAliases[output.key] ?? ""}
                onChange={(event) =>
                  onChange({
                    outputAliases: {
                      ...config.outputAliases,
                      [output.key]: event.target.value,
                    },
                  })
                }
                placeholder={`Alias for ${output.key}`}
                className="h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                Downstream requests can reference this output using the alias you set here.
              </p>
            </label>
          ))}
        </div>
      ) : null}

      {activeSection === "request" ? (
        editableRequest ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            <div className="rounded-2xl border border-border/40 bg-background/70 p-4 shadow-sm">
              <RequestUrlBar
                method={editableRequest.method}
                url={editableRequest.url}
                suggestions={suggestions}
                onMethodChange={(method) => onRequestChange(editableRequest.id, { method })}
                onUrlChange={(url) => onRequestChange(editableRequest.id, { url })}
              />
            </div>
            <div className="min-h-0 flex-1">
              <PipelineInspectorEditorSections
                section="request"
                step={editableRequest}
                suggestions={suggestions}
                isBodyDisabled={
                  editableRequest.method === "GET" || editableRequest.method === "HEAD"
                }
                onChange={(partial) => onRequestChange(editableRequest.id, partial)}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No internal request available.</p>
        )
      ) : null}

      {activeSection === "details" ? (
        <div className="space-y-4 overflow-y-auto">
          <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
            <p className="text-sm font-semibold text-foreground">
              {definition?.name || config.label}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {definition?.description || "Reusable request flow"}
            </p>
            <div className={segmentedTabListClassName + " mt-3 inline-flex max-w-max gap-1"}>
              <span className="px-3 py-1 text-[11px] text-muted-foreground">
                Version {config.subflowVersion}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Internal Requests</p>
            {internalRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No internal requests available.</p>
            ) : (
              internalRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between rounded-xl border border-border/40 bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-sm text-foreground">{request.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {request.url}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{request.method}</span>
                </div>
              ))
            )}
          </div>

          <Button variant="outline" disabled className="w-full">
            Subflow editor coming next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
