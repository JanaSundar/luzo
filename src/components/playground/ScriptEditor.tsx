"use client";

import { Textarea } from "@/components/ui/textarea";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/lib/ui/segmentedTabs";
import { cn } from "@/lib/utils";

interface ScriptEditorProps<TRule> {
  label: string;
  description: React.ReactNode;
  editorType: "visual" | "raw";
  script: string;
  rules: TRule[];
  onEditorTypeChange: (type: "visual" | "raw") => void;
  onScriptChange: (script: string, rules: TRule[]) => void;
  VisualBuilder: React.ComponentType<{
    rules: TRule[];
    onChange: (rules: TRule[]) => void;
  }>;
  compileRules: (rules: TRule[]) => string;
  parseScript: (script: string) => TRule[];
  placeholder?: string;
}

export function ScriptEditor<TRule>({
  label,
  description,
  editorType,
  script,
  rules,
  onEditorTypeChange,
  onScriptChange,
  VisualBuilder,
  compileRules,
  parseScript,
  placeholder,
}: ScriptEditorProps<TRule>) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div
          role="tablist"
          aria-label="Editor mode"
          className={cn("inline-flex w-fit min-w-0 items-center", segmentedTabListClassName)}
        >
          <button
            type="button"
            role="tab"
            aria-selected={editorType === "visual"}
            className={segmentedTabTriggerClassName(
              editorType === "visual",
              "h-7 shrink-0 px-3 py-1.5 whitespace-nowrap"
            )}
            onClick={() => onEditorTypeChange("visual")}
          >
            Visual
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={editorType === "raw"}
            className={segmentedTabTriggerClassName(
              editorType === "raw",
              "h-7 shrink-0 px-3 py-1.5 whitespace-nowrap"
            )}
            onClick={() => onEditorTypeChange("raw")}
          >
            Raw
          </button>
        </div>
      </div>

      {editorType === "visual" ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <VisualBuilder
            rules={rules || []}
            onChange={(newRules) => {
              onScriptChange(compileRules(newRules), newRules);
            }}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <p className="text-xs text-muted-foreground mb-2 shrink-0">{description}</p>
          <Textarea
            value={script ?? ""}
            onChange={(e) => {
              const newScript = e.target.value;
              onScriptChange(newScript, parseScript(newScript));
            }}
            placeholder={placeholder}
            className="font-mono text-xs flex-1 min-h-32"
          />
        </div>
      )}
    </div>
  );
}
