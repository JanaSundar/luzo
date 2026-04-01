"use client";

import { AnimatePresence } from "motion/react";
import { KeyValueEditor } from "@/components/playground/KeyValueEditor";
import type {
  ApiRequest,
  AuthConfig,
  FormDataField,
  KeyValuePair,
  MockConfig,
  PollingPolicy,
  PostRequestRule,
  PreRequestRule,
  TestRule,
  WebhookWaitPolicy,
} from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { RequestAuthPanel } from "./RequestAuthPanel";
import { RequestAsyncPanel } from "./RequestAsyncPanel";
import { RequestBodyPanel } from "./RequestBodyPanel";
import { RequestFormTabPanel } from "./RequestFormPanels";
import { RequestMockPanel } from "./RequestMockPanel";
import { RequestScriptsPanel } from "./RequestScriptsPanel";
import type { TabId } from "./RequestFormTabs";

interface RequestFormContentProps {
  activeTab: TabId;
  animateTabContent: boolean;
  auth: AuthConfig;
  body: string | null;
  bodyType: ApiRequest["bodyType"];
  formDataFields?: FormDataField[];
  headers: KeyValuePair[];
  mockConfig?: MockConfig;
  params: KeyValuePair[];
  pollingPolicy?: PollingPolicy;
  postRequestEditorType: "visual" | "raw";
  postRequestRules: PostRequestRule[];
  postRequestScript: string;
  preRequestEditorType: "visual" | "raw";
  preRequestRules: PreRequestRule[];
  preRequestScript: string;
  suggestions: VariableSuggestion[];
  testEditorType: "visual" | "raw";
  testRules: TestRule[];
  testScript: string;
  webhookWaitPolicy?: WebhookWaitPolicy;
  onChange: (
    partial: {
      params?: KeyValuePair[];
      headers?: KeyValuePair[];
      auth?: AuthConfig;
      mockConfig?: MockConfig;
    } & Partial<ApiRequest>,
  ) => void;
}

export function RequestFormContent({
  activeTab,
  animateTabContent,
  auth,
  body,
  bodyType,
  formDataFields,
  headers,
  mockConfig,
  params,
  pollingPolicy,
  postRequestEditorType,
  postRequestRules,
  postRequestScript,
  preRequestEditorType,
  preRequestRules,
  preRequestScript,
  suggestions,
  testEditorType,
  testRules,
  testScript,
  webhookWaitPolicy,
  onChange,
}: RequestFormContentProps) {
  return (
    <AnimatePresence mode="wait">
      {activeTab === "params" ? (
        <RequestFormTabPanel
          key="params"
          animate={animateTabContent}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <KeyValueEditor
            pairs={params}
            onChange={(u) => onChange({ params: u })}
            placeholder="Parameter"
            suggestions={suggestions}
          />
        </RequestFormTabPanel>
      ) : null}

      {activeTab === "headers" ? (
        <RequestFormTabPanel
          key="headers"
          animate={animateTabContent}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <KeyValueEditor
            pairs={headers}
            onChange={(u) => onChange({ headers: u })}
            placeholder="Header"
            suggestions={suggestions}
          />
        </RequestFormTabPanel>
      ) : null}

      {activeTab === "body" ? (
        <RequestFormTabPanel
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
        </RequestFormTabPanel>
      ) : null}

      {activeTab === "auth" ? (
        <RequestFormTabPanel
          key="auth"
          animate={animateTabContent}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <RequestAuthPanel
            auth={auth}
            suggestions={suggestions}
            onChange={(u) => onChange({ auth: u })}
          />
        </RequestFormTabPanel>
      ) : null}

      {activeTab === "scripts" ? (
        <RequestFormTabPanel
          key="scripts"
          animate={animateTabContent}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <RequestScriptsPanel
            preRequestEditorType={preRequestEditorType}
            postRequestEditorType={postRequestEditorType}
            testEditorType={testEditorType}
            preRequestRules={preRequestRules}
            postRequestRules={postRequestRules}
            testRules={testRules}
            preRequestScript={preRequestScript}
            postRequestScript={postRequestScript}
            testScript={testScript}
            onChange={onChange}
          />
        </RequestFormTabPanel>
      ) : null}

      {activeTab === "async" ? (
        <RequestFormTabPanel
          key="async"
          animate={animateTabContent}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <RequestAsyncPanel
            pollingPolicy={pollingPolicy}
            webhookWaitPolicy={webhookWaitPolicy}
            onChange={onChange}
          />
        </RequestFormTabPanel>
      ) : null}

      {activeTab === "mock" && mockConfig ? (
        <RequestFormTabPanel
          key="mock"
          animate={animateTabContent}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <RequestMockPanel
            config={mockConfig}
            suggestions={suggestions}
            onChange={(u) => onChange({ mockConfig: u })}
          />
        </RequestFormTabPanel>
      ) : null}
    </AnimatePresence>
  );
}
