"use client";

import { useState } from "react";
import { PostRequestBuilder } from "@/components/playground/PostRequestBuilder";
import { PreRequestBuilder } from "@/components/playground/PreRequestBuilder";
import { ScriptEditor } from "@/components/playground/ScriptEditor";
import { TestBuilder } from "@/components/playground/TestBuilder";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/utils/ui/segmentedTabs";
import { cn } from "@/utils";
import {
  compilePostRequestRules,
  compilePreRequestRules,
  compileTestRules,
} from "@/utils/rule-compiler";
import {
  parsePostRequestScript,
  parsePreRequestScript,
  parseTestScript,
} from "@/utils/rule-parser";
import {
  POST_REQUEST_EXAMPLES,
  PRE_REQUEST_EXAMPLES,
  TEST_EXAMPLES,
} from "@/utils/script-examples";
import type { PipelineStep, PostRequestRule, PreRequestRule, TestRule } from "@/types";

interface RequestScriptsPanelProps {
  preRequestEditorType: "visual" | "raw";
  postRequestEditorType: "visual" | "raw";
  testEditorType: "visual" | "raw";
  preRequestRules: PreRequestRule[];
  postRequestRules: PostRequestRule[];
  testRules: TestRule[];
  preRequestScript: string;
  postRequestScript: string;
  testScript: string;
  onChange: (partial: Partial<PipelineStep>) => void;
}

export function RequestScriptsPanel({
  preRequestEditorType,
  postRequestEditorType,
  testEditorType,
  preRequestRules,
  postRequestRules,
  testRules,
  preRequestScript,
  postRequestScript,
  testScript,
  onChange,
}: RequestScriptsPanelProps) {
  const [scriptTab, setScriptTab] = useState<"pre-request" | "post-request" | "tests">(
    "pre-request",
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div
        role="tablist"
        aria-label="Scripts"
        className={cn("inline-flex w-fit min-w-0 items-center", segmentedTabListClassName)}
      >
        {(["pre-request", "post-request", "tests"] as const).map((t) => {
          const active = scriptTab === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setScriptTab(t)}
              className={segmentedTabTriggerClassName(
                active,
                "h-8 shrink-0 whitespace-nowrap px-3",
              )}
            >
              {t === "pre-request"
                ? "Pre-request"
                : t === "post-request"
                  ? "Post-request"
                  : "Tests"}
            </button>
          );
        })}
      </div>

      {scriptTab === "pre-request" && (
        <ScriptEditor<PreRequestRule>
          label="Setup actions before the run"
          description="Run before request"
          editorType={preRequestEditorType}
          script={preRequestScript}
          rules={preRequestRules}
          onEditorTypeChange={(type) => onChange({ preRequestEditorType: type })}
          onScriptChange={(script, rules) =>
            onChange({ preRequestScript: script, preRequestRules: rules as PreRequestRule[] })
          }
          VisualBuilder={PreRequestBuilder}
          compileRules={compilePreRequestRules}
          parseScript={parsePreRequestScript}
          placeholder={PRE_REQUEST_EXAMPLES}
        />
      )}

      {scriptTab === "tests" && (
        <ScriptEditor<TestRule>
          label="Assertions after the response"
          description="Assertions"
          editorType={testEditorType}
          script={testScript}
          rules={testRules}
          onEditorTypeChange={(type) => onChange({ testEditorType: type })}
          onScriptChange={(script, rules) =>
            onChange({ testScript: script, testRules: rules as TestRule[] })
          }
          VisualBuilder={TestBuilder}
          compileRules={compileTestRules}
          parseScript={parseTestScript}
          placeholder={TEST_EXAMPLES}
        />
      )}

      {scriptTab === "post-request" && (
        <ScriptEditor<PostRequestRule>
          label="Transform the response before tests"
          description="Run after the response and before tests"
          editorType={postRequestEditorType}
          script={postRequestScript}
          rules={postRequestRules}
          onEditorTypeChange={(type) => onChange({ postRequestEditorType: type })}
          onScriptChange={(script, rules) =>
            onChange({
              postRequestRules: rules as PostRequestRule[],
              postRequestScript: script,
            })
          }
          VisualBuilder={PostRequestBuilder}
          compileRules={compilePostRequestRules}
          parseScript={parsePostRequestScript}
          placeholder={POST_REQUEST_EXAMPLES}
        />
      )}
    </div>
  );
}
