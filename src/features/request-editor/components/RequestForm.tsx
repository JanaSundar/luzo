"use client";

import { useMemo, useState } from "react";
import { cn } from "@/utils";
import type {
  ApiRequest,
  AuthConfig,
  FormDataField,
  KeyValuePair,
  PollingPolicy,
  PostRequestRule,
  PreRequestRule,
  TestResult,
  TestRule,
  WebhookWaitPolicy,
  MockConfig,
} from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { RequestFormTabs, type TabId } from "./RequestFormTabs";
import { RequestFormContent } from "./RequestFormContent";

type RequestFormFields = Pick<
  ApiRequest,
  | "headers"
  | "params"
  | "body"
  | "bodyType"
  | "formDataFields"
  | "auth"
  | "preRequestEditorType"
  | "postRequestEditorType"
  | "testEditorType"
  | "preRequestRules"
  | "postRequestRules"
  | "testRules"
  | "preRequestScript"
  | "postRequestScript"
  | "testScript"
  | "pollingPolicy"
  | "webhookWaitPolicy"
> & { mockConfig?: MockConfig };

interface RequestFormProps {
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: string | null;
  bodyType: ApiRequest["bodyType"];
  formDataFields?: FormDataField[];
  auth: AuthConfig;
  preRequestEditorType?: "visual" | "raw";
  postRequestEditorType?: "visual" | "raw";
  testEditorType?: "visual" | "raw";
  preRequestRules?: PreRequestRule[];
  postRequestRules?: PostRequestRule[];
  testRules?: TestRule[];
  preRequestScript?: string;
  postRequestScript?: string;
  testScript?: string;
  pollingPolicy?: PollingPolicy;
  webhookWaitPolicy?: WebhookWaitPolicy;
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
  routingConfigured?: boolean;
  showRoutingTab?: boolean;
}

export function RequestForm({
  headers,
  params,
  body,
  bodyType,
  formDataFields,
  auth,
  preRequestEditorType = "visual",
  postRequestEditorType = "visual",
  testEditorType = "visual",
  preRequestRules = [],
  postRequestRules = [],
  testRules = [],
  preRequestScript = "",
  postRequestScript = "",
  testScript = "",
  pollingPolicy,
  webhookWaitPolicy,
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
  routingConfigured = false,
  showRoutingTab = false,
}: RequestFormProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<TabId>(defaultTab);
  const activeTab = externalActiveTab ?? internalActiveTab;
  const handleTabChange = onTabChange ?? setInternalActiveTab;

  const paramCount = useMemo(() => params.filter((p) => p.enabled && p.key).length, [params]);
  const headerCount = useMemo(() => headers.filter((h) => h.enabled && h.key).length, [headers]);
  const hasTestResults = useMemo(() => !!(testResults && testResults.length > 0), [testResults]);
  const asyncConfigured = Boolean(pollingPolicy?.enabled || webhookWaitPolicy?.enabled);

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      {!showContentOnly && (
        <div className="flex h-12 shrink-0 items-center px-1 mb-2">
          <RequestFormTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            paramCount={paramCount}
            headerCount={headerCount}
            hasTestResults={hasTestResults}
            instanceId={instanceId}
            disabledTabs={disabledTabs}
            routingConfigured={routingConfigured}
            showMockTab={!!mockConfig}
            showRoutingTab={showRoutingTab}
            mockEnabled={mockConfig?.enabled}
            asyncConfigured={asyncConfigured}
          />
        </div>
      )}

      {!showTabsOnly && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background/50 rounded-2xl border border-border/30 px-5 py-5 shadow-sm">
          <RequestFormContent
            activeTab={activeTab}
            animateTabContent={animateTabContent}
            auth={auth}
            body={body}
            bodyType={bodyType}
            formDataFields={formDataFields}
            headers={headers}
            mockConfig={mockConfig}
            params={params}
            pollingPolicy={pollingPolicy}
            postRequestEditorType={postRequestEditorType}
            postRequestRules={postRequestRules}
            postRequestScript={postRequestScript}
            preRequestEditorType={preRequestEditorType}
            preRequestRules={preRequestRules}
            preRequestScript={preRequestScript}
            suggestions={suggestions}
            testEditorType={testEditorType}
            testRules={testRules}
            testScript={testScript}
            webhookWaitPolicy={webhookWaitPolicy}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  );
}
