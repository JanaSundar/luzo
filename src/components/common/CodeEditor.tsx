"use client";
import { autocompletion, type CompletionContext } from "@codemirror/autocomplete";
import { json } from "@codemirror/lang-json";
import CodeMirror from "@uiw/react-codemirror";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  className?: string;
  appearance?: "default" | "solid-black";
}

function jsonCompletions(context: CompletionContext) {
  const word = context.matchBefore(/[\w"$._]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  const options = [
    { label: "true", type: "keyword" },
    { label: "false", type: "keyword" },
    { label: "null", type: "keyword" },
  ];

  return {
    from: word.from,
    options,
  };
}

export function CodeEditor({
  value,
  onChange,
  placeholder,
  height,
  className,
  appearance = "default",
}: CodeEditorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div
      className={cn(
        "relative border border-border/40 rounded-md overflow-hidden p-4",
        appearance === "solid-black"
          ? "bg-black text-white [&_.cm-editor]:bg-black [&_.cm-scroller]:bg-black"
          : "bg-background [&_.cm-editor]:bg-transparent [&_.cm-scroller]:bg-transparent",
        // Make inner CodeMirror fill and inherit background, and match JSON viewer typography
        "[&_.cm-editor]:h-full [&_.cm-scroller]:h-full",
        "[&_.cm-content]:text-xs [&_.cm-content]:leading-relaxed",
        !height && "h-full",
        className
      )}
    >
      <CodeMirror
        value={value}
        height={height ?? "100%"}
        // Ensure the root CodeMirror container stretches to the wrapper
        style={{ height: "100%" }}
        theme={isDark ? "dark" : "light"}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
        }}
        extensions={[
          json(),
          autocompletion({
            override: [jsonCompletions],
          }),
        ]}
        onChange={(val) => onChange(val)}
      />
      {placeholder && !value && (
        <div className="pointer-events-none absolute inset-0 px-3 py-2 text-xs text-muted-foreground">
          <pre className="whitespace-pre-wrap">{placeholder}</pre>
        </div>
      )}
    </div>
  );
}
