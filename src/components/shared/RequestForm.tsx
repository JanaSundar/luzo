"use client";

import { AnimatePresence } from "motion/react";
import { type ReactNode, useMemo, useState } from "react";
import { FormDataBodyEditor } from "@/components/playground/FormDataBodyEditor";
import { JsonBodyEditor } from "@/components/playground/JsonBodyEditor";
import { KeyValueEditor } from "@/components/playground/KeyValueEditor";
import { AnimatedTabContent } from "@/components/ui/animated-tab-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  ApiRequest,
  AuthConfig,
  FormDataField,
  KeyValuePair,
  PreRequestRule,
  TestResult,
  TestRule,
} from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { RequestAuthPanel } from "./RequestAuthPanel";
import { RequestFormTabs, type TabId } from "./RequestFormTabs";
import { RequestScriptsPanel } from "./RequestScriptsPanel";

type RequestFormFields = Pick<
  ApiRequest,
  | "headers"
  | "params"
  | "body"
  | "bodyType"
  | "formDataFields"
  | "auth"
  | "preRequestEditorType"
  | "testEditorType"
  | "preRequestRules"
  | "testRules"
  | "preRequestScript"
  | "testScript"
>;

interface RequestFormProps {
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: string | null;
  bodyType: ApiRequest["bodyType"];
  formDataFields?: FormDataField[];
  auth: AuthConfig;
  preRequestEditorType?: "visual" | "raw";
  testEditorType?: "visual" | "raw";
  preRequestRules?: PreRequestRule[];
  testRules?: TestRule[];
  preRequestScript?: string;
  testScript?: string;
  testResults?: TestResult[];
  suggestions?: VariableSuggestion[];
  onChange: (partial: Partial<RequestFormFields>) => void;
  onTabChange?: (tab: TabId) => void;
  activeTab?: TabId;
  defaultTab?: TabId;
  className?: string;
  instanceId?: string;
  showTabsOnly?: boolean;
  showContentOnly?: boolean;
  /** When false, tab panels swap without motion (avoids distorted text in tight flex/scroll layouts, e.g. pipeline StepCard). */
  animateTabContent?: boolean;
  disabledTabs?: TabId[];
}

function RequestFormTabPanel({
  animate,
  className,
  children,
}: {
  animate: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (animate) {
    return <AnimatedTabContent className={className}>{children}</AnimatedTabContent>;
  }
  return <div className={cn("w-full min-w-0", className ?? "block")}>{children}</div>;
}

export function RequestForm({
  headers,
  params,
  body,
  bodyType,
  formDataFields,
  auth,
  preRequestEditorType = "visual",
  testEditorType = "visual",
  preRequestRules = [],
  testRules = [],
  preRequestScript = "",
  testScript = "",
  testResults,
  suggestions = [],
  onChange,
  activeTab: externalActiveTab,
  onTabChange,
  defaultTab = "params",
  className,
  instanceId,
  showTabsOnly = false,
  showContentOnly = false,
  animateTabContent = true,
  disabledTabs = [],
}: RequestFormProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<TabId>(defaultTab);

  const activeTab = externalActiveTab ?? internalActiveTab;
  const handleTabChange = onTabChange ?? setInternalActiveTab;

  const paramCount = useMemo(() => params.filter((p) => p.enabled && p.key).length, [params]);
  const headerCount = useMemo(() => headers.filter((h) => h.enabled && h.key).length, [headers]);
  const hasTestResults = useMemo(() => !!(testResults && testResults.length > 0), [testResults]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/45 bg-background",
        className,
      )}
    >
      {!showContentOnly && (
        <div className="flex h-12 shrink-0 items-center border-b border-border/40 bg-muted/10 px-3">
          <RequestFormTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            paramCount={paramCount}
            headerCount={headerCount}
            hasTestResults={hasTestResults}
            instanceId={instanceId}
            disabledTabs={disabledTabs}
          />
        </div>
      )}

      {!showTabsOnly && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background px-4 py-4">
          <AnimatePresence mode="wait">
            {activeTab === "params" && (
              <RequestFormTabPanel key="params" animate={animateTabContent}>
                <KeyValueEditor
                  pairs={params}
                  onChange={(updated) => onChange({ params: updated })}
                  placeholder="Parameter"
                  suggestions={suggestions}
                />
              </RequestFormTabPanel>
            )}

            {activeTab === "headers" && (
              <RequestFormTabPanel key="headers" animate={animateTabContent}>
                <KeyValueEditor
                  pairs={headers}
                  onChange={(updated) => onChange({ headers: updated })}
                  placeholder="Header"
                  suggestions={suggestions}
                />
              </RequestFormTabPanel>
            )}

            {activeTab === "body" && (
              <RequestFormTabPanel
                key="body"
                animate={animateTabContent}
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                  <div className="flex shrink-0 items-center gap-3 rounded-lg border border-border/40 bg-muted/10 px-3 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Body
                    </span>
                    <Select
                      value={bodyType}
                      onValueChange={(v) => {
                        const newType = v as ApiRequest["bodyType"];
                        onChange({
                          bodyType: newType,
                          body: newType === "form-data" ? null : body,
                          formDataFields:
                            newType === "form-data" && !formDataFields?.length
                              ? []
                              : formDataFields,
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 w-40 border-border/40 bg-background text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="raw">Raw</SelectItem>
                        <SelectItem value="form-data">Form Data</SelectItem>
                        <SelectItem value="x-www-form-urlencoded">URL Encoded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {bodyType === "form-data" && (
                    <FormDataBodyEditor
                      fields={formDataFields ?? []}
                      onChange={(updated) => onChange({ formDataFields: updated })}
                      suggestions={suggestions}
                    />
                  )}

                  {bodyType !== "none" && bodyType !== "form-data" && (
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                      <div className="mb-2 shrink-0 text-[11px] font-medium text-muted-foreground">
                        {bodyType === "json" ? "JSON body" : "Raw body"}
                      </div>
                      <JsonBodyEditor
                        value={body ?? ""}
                        onChange={(val) => onChange({ body: val })}
                        suggestions={suggestions}
                        placeholder={
                          bodyType === "json" ? '{\n  "key": "value"\n}' : "Request body..."
                        }
                        className="h-full"
                        mode={bodyType === "json" ? "json" : "text"}
                      />
                    </div>
                  )}
                </div>
              </RequestFormTabPanel>
            )}

            {activeTab === "auth" && (
              <RequestFormTabPanel key="auth" animate={animateTabContent}>
                <RequestAuthPanel
                  auth={auth}
                  suggestions={suggestions}
                  onChange={(updated) => onChange({ auth: updated })}
                />
              </RequestFormTabPanel>
            )}

            {activeTab === "scripts" && (
              <RequestFormTabPanel key="scripts" animate={animateTabContent}>
                <RequestScriptsPanel
                  preRequestEditorType={preRequestEditorType}
                  testEditorType={testEditorType}
                  preRequestRules={preRequestRules}
                  testRules={testRules}
                  preRequestScript={preRequestScript}
                  testScript={testScript}
                  onChange={onChange}
                />
              </RequestFormTabPanel>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
