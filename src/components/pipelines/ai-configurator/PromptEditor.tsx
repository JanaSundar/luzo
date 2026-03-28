"use client";

import { RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { TemplateTextarea } from "@/components/ui/template-textarea";
import { usePipelineDebugStore } from "@/stores/usePipelineDebugStore";
import { createVariableSuggestion } from "@/utils/variableMetadata";
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

  const suggestions: VariableSuggestion[] = useMemo(
    () =>
      signalGroups.flatMap((g) =>
        g.variables.map((v) => ({
          ...createVariableSuggestion({
            path: v.path,
            label: v.label,
            resolvedValue: v.value,
            stepId: g.stepId,
            type: "body" as const,
          }),
        })),
      ),
    [signalGroups],
  );

  const { selectedSignals } = usePipelineDebugStore();
  const selectedPaths = useMemo(
    () => suggestions.filter((s) => selectedSignals.includes(s.path)).map((s) => s.path),
    [selectedSignals, suggestions],
  );
  const visiblePaths = selectedPaths.slice(0, 6);
  const hiddenCount = Math.max(0, selectedPaths.length - visiblePaths.length);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.4rem] border border-border/50 bg-background/80 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/40 px-5 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Step 2
          </div>
          <p className="max-w-2xl text-sm font-medium">
            Write one clear instruction for the model.
          </p>
          <p className="max-w-2xl text-xs text-muted-foreground">
            Good prompts are short and specific. Ask for outcome, evidence, risks, and actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            {selectedCount} signal{selectedCount !== 1 ? "s" : ""}
          </div>
          {estimatedTokens > 0 ? (
            <div className="rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
              ~{estimatedTokens} tokens
            </div>
          ) : null}
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/50 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            onClick={onRevert}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/50 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            onClick={onClear}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        <TemplateTextarea
          value={prompt}
          onChange={onChange}
          suggestions={suggestions}
          className="w-full"
          textareaClassName="h-[260px] border-0 bg-transparent px-5 py-4 font-mono text-[13px] leading-6 focus-visible:ring-0 resize-none"
          placeholder="Example: Summarize the run, highlight failures and latency outliers, and give the top 3 actions. Use {{variables}} when needed."
        />
        <div className="space-y-2 border-t border-border/40 bg-muted/10 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Selected Variables
            </p>
            <span className="text-[10px] text-muted-foreground">{prompt.length} chars</span>
          </div>
          {selectedPaths.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {visiblePaths.map((path) => (
                <span
                  key={path}
                  className="rounded-md border border-border/50 bg-background px-2 py-1 font-mono text-[10px] text-foreground/80"
                >
                  {path}
                </span>
              ))}
              {hiddenCount > 0 && (
                <span className="rounded-md border border-border/50 bg-background px-2 py-1 text-[10px] text-muted-foreground">
                  +{hiddenCount} more
                </span>
              )}
            </div>
          )}
          {!selectedPaths.length && (
            <p className="text-xs text-muted-foreground">
              Select signals to reference them in the prompt.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
