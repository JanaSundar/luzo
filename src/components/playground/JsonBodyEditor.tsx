"use client";

import { autocompletion, type CompletionContext } from "@codemirror/autocomplete";
import { json } from "@codemirror/lang-json";
import CodeMirror from "@uiw/react-codemirror";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { VariableSuggestion } from "@/types/pipeline-debug";

const TRIGGER = "{{";

function variableCompletions(
  suggestions: VariableSuggestion[],
  context: CompletionContext,
): { from: number; options: { label: string; detail?: string; apply?: string }[] } | null {
  const line = context.state.doc.lineAt(context.pos);
  const textBefore = line.text.slice(0, context.pos - line.from);
  const triggerIdx = textBefore.lastIndexOf(TRIGGER);
  if (triggerIdx === -1) return null;

  const between = textBefore.slice(triggerIdx + TRIGGER.length);
  if (between.includes("}")) return null;
  if (between.includes("\n")) return null;

  const query = between.toLowerCase();
  const filtered = suggestions
    .filter((s) => s.path.toLowerCase().includes(query) || s.label.toLowerCase().includes(query))
    .slice(0, 15);

  if (filtered.length === 0) return null;

  const from = line.from + triggerIdx + TRIGGER.length;

  return {
    from,
    options: filtered.map((s) => ({
      label: s.path,
      detail: s.label,
      apply: `${s.path}}}`,
    })),
  };
}

function jsonCompletions(context: CompletionContext) {
  const word = context.matchBefore(/[\w"$._]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return {
    from: word.from,
    options: [
      { label: "true", type: "keyword" },
      { label: "false", type: "keyword" },
      { label: "null", type: "keyword" },
    ],
  };
}

export interface JsonBodyEditorProps {
  value: string;
  onChange: (value: string) => void;
  suggestions?: VariableSuggestion[];
  placeholder?: string;
  className?: string;
  /** Use JSON mode (syntax highlighting, fold) or plain text for raw body */
  mode?: "json" | "text";
}

export function JsonBodyEditor({
  value,
  onChange,
  suggestions = [],
  placeholder,
  className,
  mode = "json",
}: JsonBodyEditorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const variableCompletion = useMemo(
    () => (ctx: CompletionContext) => variableCompletions(suggestions, ctx),
    [suggestions],
  );

  const extensions = useMemo(
    () => [
      ...(mode === "json" ? [json()] : []),
      autocompletion({
        override: [variableCompletion, ...(mode === "json" ? [jsonCompletions] : [])],
      }),
    ],
    [mode, variableCompletion],
  );

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border/40 bg-background",
        "[&_.cm-editor]:h-full [&_.cm-scroller]:h-full",
        "[&_.cm-content]:text-xs [&_.cm-content]:leading-relaxed",
        className,
      )}
    >
      <CodeMirror
        value={value}
        height="100%"
        style={{ minHeight: 200 }}
        theme={isDark ? "dark" : "light"}
        basicSetup={{
          lineNumbers: true,
          foldGutter: mode === "json",
          highlightActiveLine: true,
        }}
        extensions={extensions}
        onChange={(val) => onChange(val)}
      />
      {placeholder && !value && (
        <div className="pointer-events-none absolute inset-0 px-3 py-2 text-xs text-muted-foreground">
          <pre className="whitespace-pre-wrap font-mono">{placeholder}</pre>
        </div>
      )}
    </div>
  );
}
