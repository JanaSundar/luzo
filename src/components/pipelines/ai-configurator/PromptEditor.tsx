"use client";

import { Type } from "lucide-react";
import { TemplateTextarea } from "@/components/ui/template-textarea";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import type { VariableSuggestion } from "@/types/pipeline-debug";

interface PromptEditorProps {
  prompt: string;
  onChange: (value: string) => void;
  onRevert: () => void;
  onClear: () => void;
  selectedCount: number;
  estimatedTokens: number;
}

export function PromptEditor({
  prompt,
  onChange,
  onRevert,
  onClear,
  selectedCount,
  estimatedTokens,
}: PromptEditorProps) {
  const { signalGroups } = usePipelineDebugStore();

  const suggestions: VariableSuggestion[] = signalGroups.flatMap((g) =>
    g.variables.map((v) => ({
      path: v.path,
      label: v.label,
      stepId: g.stepId,
      type: "body" as const,
    })),
  );

  const { selectedSignals } = usePipelineDebugStore();
  const selectedPaths = suggestions
    .filter((s) => selectedSignals.includes(s.path))
    .map((s) => s.path);

  return (
    <div className="space-y-4 bg-background border rounded-xl shadow-sm border-muted/50">
      <div className="p-4 bg-muted/10 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Narrative Prompt
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            onClick={onRevert}
          >
            ↺ Revert
          </button>
          <button
            type="button"
            className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClear}
          >
            ✕ Clear
          </button>
        </div>
      </div>
      <TemplateTextarea
        value={prompt}
        onChange={onChange}
        suggestions={suggestions}
        className="w-full"
        textareaClassName="h-[300px] font-mono text-sm leading-relaxed p-6 border-none focus-visible:ring-0 resize-none bg-background/50"
        placeholder="Describe what the AI should analyze... Use {{}} for variables."
      />
      <div className="p-3 px-4 flex flex-col gap-2 bg-muted/5 border-t">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">
            {selectedCount} signal{selectedCount !== 1 ? "s" : ""} selected
          </span>
          {estimatedTokens > 0 && (
            <span className="text-[10px] text-muted-foreground">
              ~{estimatedTokens} tokens estimated
            </span>
          )}
        </div>
        {selectedPaths.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-muted/20 mt-1">
            {selectedPaths.map((path) => (
              <span
                key={path}
                className="text-[9px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20"
              >
                {path}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
