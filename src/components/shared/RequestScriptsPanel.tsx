"use client";

import { useState } from "react";
import { PreRequestBuilder } from "@/components/playground/PreRequestBuilder";
import { ScriptEditor } from "@/components/playground/ScriptEditor";
import { TestBuilder } from "@/components/playground/TestBuilder";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/utils/ui/segmentedTabs";
import { cn } from "@/utils";
import { compilePreRequestRules, compileTestRules } from "@/utils/rule-compiler";
import { parsePreRequestScript, parseTestScript } from "@/utils/rule-parser";
import { PRE_REQUEST_EXAMPLES, TEST_EXAMPLES } from "@/utils/script-examples";
import type { PipelineStep, PreRequestRule, TestRule } from "@/types";

interface RequestScriptsPanelProps {
  preRequestEditorType: "visual" | "raw";
  testEditorType: "visual" | "raw";
  preRequestRules: PreRequestRule[];
  testRules: TestRule[];
  preRequestScript: string;
  testScript: string;
  onChange: (partial: Partial<PipelineStep>) => void;
}

export function RequestScriptsPanel({
  preRequestEditorType,
  testEditorType,
  preRequestRules,
  testRules,
  preRequestScript,
  testScript,
  onChange,
}: RequestScriptsPanelProps) {
  const [scriptTab, setScriptTab] = useState<"pre-request" | "tests">("pre-request");

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div
        role="tablist"
        aria-label="Scripts"
        className={cn("inline-flex w-fit min-w-0 items-center", segmentedTabListClassName)}
      >
        {(["pre-request", "tests"] as const).map((t) => {
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
              {t === "pre-request" ? "Pre-request" : "Tests"}
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
    </div>
  );
}
