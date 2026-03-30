"use client";

import { type ReactNode, useRef, useState } from "react";
import { KeyValueEditor } from "@/components/playground/KeyValueEditor";
import { RequestAsyncPanel } from "@/features/request-editor/components/RequestAsyncPanel";
import { RequestAuthPanel } from "@/features/request-editor/components/RequestAuthPanel";
import { RequestBodyPanel } from "@/features/request-editor/components/RequestBodyPanel";
import { RequestScriptsPanel } from "@/features/request-editor/components/RequestScriptsPanel";
import type { PipelineStep } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { cn } from "@/utils";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/utils/ui/segmentedTabs";
import type { PipelineInspectorSection } from "./PipelineInspectorSectionNav";

type RequestSectionTab = "params" | "headers" | "body" | "auth";
type FlowSectionTab = "scripts" | "async";

interface PipelineInspectorEditorSectionsProps {
  section: Extract<PipelineInspectorSection, "request" | "flow">;
  step: PipelineStep;
  suggestions: VariableSuggestion[];
  isBodyDisabled: boolean;
  onChange: (partial: Partial<PipelineStep>) => void;
}

export function PipelineInspectorEditorSections({
  section,
  step,
  suggestions,
  isBodyDisabled,
  onChange,
}: PipelineInspectorEditorSectionsProps) {
  const [requestTab, setRequestTab] = useState<RequestSectionTab>("params");
  const [flowTab, setFlowTab] = useState<FlowSectionTab>("scripts");

  if (section === "request") {
    const activeTab = isBodyDisabled && requestTab === "body" ? "params" : requestTab;
    return (
      <SectionCard
        tabs={
          <SimpleTabs
            activeTab={activeTab}
            ariaLabel="Request sections"
            tabs={[
              ["params", "Params"],
              ["headers", "Headers"],
              ["body", "Body"],
              ["auth", "Auth"],
            ]}
            onChange={setRequestTab}
            disabledTabs={isBodyDisabled ? ["body"] : []}
            columns={4}
          />
        }
      >
        {activeTab === "params" ? (
          <KeyValueEditor
            pairs={step.params}
            onChange={(params) => onChange({ params })}
            placeholder="Parameter"
            suggestions={suggestions}
          />
        ) : null}

        {activeTab === "headers" ? (
          <KeyValueEditor
            pairs={step.headers}
            onChange={(headers) => onChange({ headers })}
            placeholder="Header"
            suggestions={suggestions}
          />
        ) : null}

        {activeTab === "body" ? (
          <RequestBodyPanel
            body={step.body}
            bodyType={step.bodyType}
            formDataFields={step.formDataFields}
            suggestions={suggestions}
            onChange={onChange}
          />
        ) : null}

        {activeTab === "auth" ? (
          <RequestAuthPanel
            auth={step.auth}
            suggestions={suggestions}
            onChange={(auth) => onChange({ auth })}
          />
        ) : null}
      </SectionCard>
    );
  }

  return (
    <SectionCard
      tabs={
        <SimpleTabs
          activeTab={flowTab}
          ariaLabel="Flow sections"
          tabs={[
            ["scripts", "Scripts"],
            ["async", "Async Controls"],
          ]}
          onChange={setFlowTab}
          columns={2}
        />
      }
    >
      {flowTab === "scripts" ? (
        <RequestScriptsPanel
          preRequestEditorType={step.preRequestEditorType ?? "visual"}
          postRequestEditorType={step.postRequestEditorType ?? "visual"}
          testEditorType={step.testEditorType ?? "visual"}
          preRequestRules={step.preRequestRules ?? []}
          postRequestRules={step.postRequestRules ?? []}
          testRules={step.testRules ?? []}
          preRequestScript={step.preRequestScript ?? ""}
          postRequestScript={step.postRequestScript ?? ""}
          testScript={step.testScript ?? ""}
          onChange={onChange}
        />
      ) : (
        <RequestAsyncPanel
          pollingPolicy={step.pollingPolicy}
          webhookWaitPolicy={step.webhookWaitPolicy}
          onChange={onChange}
        />
      )}
    </SectionCard>
  );
}

function SectionCard({ tabs, children }: { tabs: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-[500px] min-h-0 flex-col overflow-hidden rounded-2xl border border-border/40 bg-background/70 p-5 shadow-sm">
      <div className="mb-5 shrink-0">{tabs}</div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

function SimpleTabs<T extends string>({
  activeTab,
  ariaLabel,
  tabs,
  onChange,
  disabledTabs = [],
  columns,
}: {
  activeTab: T;
  ariaLabel: string;
  tabs: readonly [T, string][];
  onChange: (tab: T) => void;
  disabledTabs?: T[];
  columns: 2 | 4;
}) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        segmentedTabListClassName,
        "grid w-full gap-2",
        columns === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2",
      )}
    >
      {tabs.map(([tab, label], index) => {
        const active = activeTab === tab;
        const disabled = disabledTabs.includes(tab);
        return (
          <button
            key={tab}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab)}
            onKeyDown={(event) => {
              if (disabled) return;

              let nextIndex = -1;
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                nextIndex = findNextEnabledIndex(tabs, disabledTabs, index, 1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                nextIndex = findNextEnabledIndex(tabs, disabledTabs, index, -1);
              } else if (event.key === "Home") {
                nextIndex = tabs.findIndex(([candidate]) => !disabledTabs.includes(candidate));
              } else if (event.key === "End") {
                const reversedIndex = [...tabs]
                  .reverse()
                  .findIndex(([candidate]) => !disabledTabs.includes(candidate));
                nextIndex = reversedIndex === -1 ? -1 : tabs.length - 1 - reversedIndex;
              } else {
                return;
              }

              event.preventDefault();
              if (nextIndex < 0 || nextIndex === index) return;

              const [nextTab] = tabs[nextIndex] ?? [];
              if (!nextTab || disabledTabs.includes(nextTab)) return;

              onChange(nextTab);
              itemRefs.current[nextIndex]?.focus();
            }}
            className={segmentedTabTriggerClassName(
              active,
              "h-8 w-full justify-center px-3 text-[11px] disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function findNextEnabledIndex<T extends string>(
  tabs: readonly [T, string][],
  disabledTabs: T[],
  startIndex: number,
  direction: 1 | -1,
) {
  for (let offset = 1; offset <= tabs.length; offset += 1) {
    const nextIndex = (startIndex + offset * direction + tabs.length) % tabs.length;
    const [candidate] = tabs[nextIndex] ?? [];
    if (candidate && !disabledTabs.includes(candidate)) return nextIndex;
  }

  return startIndex;
}
