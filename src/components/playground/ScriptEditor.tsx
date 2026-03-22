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
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border/40 bg-muted/10 p-3">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
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
              "h-8 shrink-0 whitespace-nowrap px-3",
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
              "h-8 shrink-0 whitespace-nowrap px-3",
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
          <p className="mb-2 shrink-0 text-xs text-muted-foreground">{description}</p>
          <Textarea
            value={script ?? ""}
            onChange={(e) => {
              const newScript = e.target.value;
              onScriptChange(newScript, parseScript(newScript));
            }}
            placeholder={placeholder}
            className="min-h-32 flex-1 border-border/40 bg-background font-mono text-xs"
          />
        </div>
      )}
    </div>
  );
}
