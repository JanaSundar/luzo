"use client";

import { AnimatedTabContent } from "@/components/ui/animated-tab-content";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
    <AnimatedTabContent className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="bg-muted p-0.5 rounded-md flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 text-[10px]",
              editorType === "visual" && "bg-background shadow-sm"
            )}
            onClick={() => onEditorTypeChange("visual")}
          >
            Visual
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 text-[10px]",
              editorType === "raw" && "bg-background shadow-sm"
            )}
            onClick={() => onEditorTypeChange("raw")}
          >
            Raw Editor
          </Button>
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
    </AnimatedTabContent>
  );
}
