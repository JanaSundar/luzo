"use client";

import { useState } from "react";
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
  disabledTabs?: TabId[];
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
  disabledTabs = [],
}: RequestFormProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<TabId>(defaultTab);

  const activeTab = externalActiveTab ?? internalActiveTab;
  const handleTabChange = onTabChange ?? setInternalActiveTab;

  const paramCount = params.filter((p) => p.enabled && p.key).length;
  const headerCount = headers.filter((h) => h.enabled && h.key).length;
  const hasTestResults = !!(testResults && testResults.length > 0);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {!showContentOnly && (
        <div className="h-10 flex items-center shrink-0">
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {activeTab === "params" && (
            <AnimatedTabContent>
              <KeyValueEditor
                pairs={params}
                onChange={(updated) => onChange({ params: updated })}
                placeholder="Parameter"
                suggestions={suggestions}
              />
            </AnimatedTabContent>
          )}

          {activeTab === "headers" && (
            <AnimatedTabContent>
              <KeyValueEditor
                pairs={headers}
                onChange={(updated) => onChange({ headers: updated })}
                placeholder="Header"
                suggestions={suggestions}
              />
            </AnimatedTabContent>
          )}

          {activeTab === "body" && (
            <AnimatedTabContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                <div className="flex shrink-0 items-center justify-between gap-2">
                  <Select
                    value={bodyType}
                    onValueChange={(v) => {
                      const newType = v as ApiRequest["bodyType"];
                      onChange({
                        bodyType: newType,
                        body: newType === "form-data" ? null : body,
                        formDataFields:
                          newType === "form-data" && !formDataFields?.length ? [] : formDataFields,
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
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
                  {bodyType === "json" && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => {
                        const current = body ?? "";
                        if (!current.trim()) return;
                        try {
                          const parsed = JSON.parse(current);
                          onChange({ body: JSON.stringify(parsed, null, 2) });
                        } catch {
                          // ignore parse errors
                        }
                      }}
                    >
                      Prettify
                    </button>
                  )}
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
                    <div className="mb-1 shrink-0 text-xs text-muted-foreground">
                      {bodyType === "json" ? "JSON body" : "Raw body"}
                    </div>
                    <JsonBodyEditor
                      value={body ?? ""}
                      onChange={(val) => onChange({ body: val })}
                      suggestions={suggestions}
                      placeholder={
                        bodyType === "json" ? '{\n  "key": "value"\n}' : "Request body..."
                      }
                      className="min-h-[200px]"
                      mode={bodyType === "json" ? "json" : "text"}
                    />
                  </div>
                )}
              </div>
            </AnimatedTabContent>
          )}

          {activeTab === "auth" && (
            <AnimatedTabContent>
              <RequestAuthPanel
                auth={auth}
                suggestions={suggestions}
                onChange={(updated) => onChange({ auth: updated })}
              />
            </AnimatedTabContent>
          )}

          {activeTab === "scripts" && (
            <AnimatedTabContent>
              <RequestScriptsPanel
                preRequestEditorType={preRequestEditorType}
                testEditorType={testEditorType}
                preRequestRules={preRequestRules}
                testRules={testRules}
                preRequestScript={preRequestScript}
                testScript={testScript}
                onChange={onChange}
              />
            </AnimatedTabContent>
          )}
        </div>
      )}
    </div>
  );
}
