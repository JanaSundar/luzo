"use client";

import { useState } from "react";
import { PreRequestBuilder } from "@/components/playground/PreRequestBuilder";
import { ScriptEditor } from "@/components/playground/ScriptEditor";
import { TestBuilder } from "@/components/playground/TestBuilder";
import { cn } from "@/lib/utils";
import { compilePreRequestRules, compileTestRules } from "@/lib/utils/rule-compiler";
import { parsePreRequestScript, parseTestScript } from "@/lib/utils/rule-parser";
import { PRE_REQUEST_EXAMPLES, TEST_EXAMPLES } from "@/lib/utils/script-examples";
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-lg w-fit">
        {(["pre-request", "tests"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setScriptTab(t)}
            className={cn(
              "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors",
              scriptTab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "pre-request" ? "Pre-request" : "Tests"}
          </button>
        ))}
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
