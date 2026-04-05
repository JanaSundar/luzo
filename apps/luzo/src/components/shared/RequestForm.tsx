"use client";

import { AnimatePresence } from "motion/react";
import { type ReactNode, useMemo, useState } from "react";
import { KeyValueEditor } from "@/components/playground/KeyValueEditor";
import { AnimatedTabContent } from "@/components/ui/animated-tab-content";
import { cn } from "@/lib/utils";
import type {
  ApiRequest,
  AuthConfig,
  FormDataField,
  KeyValuePair,
  PreRequestRule,
  TestResult,
  TestRule,
  MockConfig,
} from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { RequestAuthPanel } from "./RequestAuthPanel";
import { RequestFormTabs, type TabId } from "./RequestFormTabs";
import { RequestScriptsPanel } from "./RequestScriptsPanel";
import { RequestMockPanel } from "./RequestMockPanel";
import { RequestBodyPanel } from "./RequestBodyPanel";

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
> & { mockConfig?: MockConfig };

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
  mockConfig?: MockConfig;
  suggestions?: VariableSuggestion[];
  onChange: (partial: Partial<RequestFormFields>) => void;
  onTabChange?: (tab: TabId) => void;
  activeTab?: TabId;
  defaultTab?: TabId;
  className?: string;
  instanceId?: string;
  showTabsOnly?: boolean;
  showContentOnly?: boolean;
  animateTabContent?: boolean;
  disabledTabs?: TabId[];
}

function TabPanel({
  animate,
  className,
  children,
}: {
  animate: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (animate) return <AnimatedTabContent className={className}>{children}</AnimatedTabContent>;
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
  mockConfig,
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
            showMockTab={!!mockConfig}
            mockEnabled={mockConfig?.enabled}
          />
        </div>
      )}

      {!showTabsOnly && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background px-4 py-4">
          <AnimatePresence mode="wait">
            {activeTab === "params" && (
              <TabPanel key="params" animate={animateTabContent}>
                <KeyValueEditor
                  pairs={params}
                  onChange={(u) => onChange({ params: u })}
                  placeholder="Parameter"
                  suggestions={suggestions}
                />
              </TabPanel>
            )}
            {activeTab === "headers" && (
              <TabPanel key="headers" animate={animateTabContent}>
                <KeyValueEditor
                  pairs={headers}
                  onChange={(u) => onChange({ headers: u })}
                  placeholder="Header"
                  suggestions={suggestions}
                />
              </TabPanel>
            )}
            {activeTab === "body" && (
              <TabPanel
                key="body"
                animate={animateTabContent}
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <RequestBodyPanel
                  body={body}
                  bodyType={bodyType}
                  formDataFields={formDataFields}
                  suggestions={suggestions}
                  onChange={onChange}
                />
              </TabPanel>
            )}
            {activeTab === "auth" && (
              <TabPanel key="auth" animate={animateTabContent}>
                <RequestAuthPanel
                  auth={auth}
                  suggestions={suggestions}
                  onChange={(u) => onChange({ auth: u })}
                />
              </TabPanel>
            )}
            {activeTab === "scripts" && (
              <TabPanel key="scripts" animate={animateTabContent}>
                <RequestScriptsPanel
                  preRequestEditorType={preRequestEditorType}
                  testEditorType={testEditorType}
                  preRequestRules={preRequestRules}
                  testRules={testRules}
                  preRequestScript={preRequestScript}
                  testScript={testScript}
                  onChange={onChange}
                />
              </TabPanel>
            )}
            {activeTab === "mock" && mockConfig && (
              <TabPanel key="mock" animate={animateTabContent}>
                <RequestMockPanel
                  config={mockConfig}
                  suggestions={suggestions}
                  onChange={(u) => onChange({ mockConfig: u })}
                />
              </TabPanel>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
