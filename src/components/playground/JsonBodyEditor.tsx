"use client";

import { type CompletionContext, autocompletion } from "@codemirror/autocomplete";
import { Compartment, type Extension } from "@codemirror/state";
import {
  HighlightStyle,
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { json } from "@codemirror/lang-json";
import { hoverTooltip, lineNumbers, EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { tags } from "@lezer/highlight";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { darkJsonPalette, lightJsonPalette } from "@/lib/json-view/theme";
import { getVariableAtRange, TEMPLATE_TRIGGER } from "@/lib/utils/templateTokens";
import { cn } from "@/lib/utils";
import type { VariableSuggestion } from "@/types/pipeline-debug";

export function JsonBodyEditor({
  value,
  onChange,
  suggestions = [],
  placeholder,
  className,
  mode = "json",
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions?: VariableSuggestion[];
  placeholder?: string;
  className?: string;
  mode?: "json" | "text";
}) {
  const { resolvedTheme } = useTheme();
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const activeTheme = resolvedTheme === "light" ? "light" : "dark";
  const palette = activeTheme === "dark" ? darkJsonPalette : lightJsonPalette;
  const languageCompartment = useMemo(() => new Compartment(), []);
  const interactionCompartment = useMemo(() => new Compartment(), []);
  const highlightExtension = useMemo(
    () =>
      syntaxHighlighting(
        HighlightStyle.define([
          { tag: tags.string, color: palette.string },
          { tag: tags.propertyName, color: palette.key },
          { tag: tags.number, color: palette.number },
          { tag: tags.bool, color: palette.boolean },
          { tag: tags.null, color: palette.null },
          { tag: [tags.separator, tags.brace, tags.squareBracket], color: palette.punctuation },
        ]),
      ),
    [palette],
  );
  const baseExtensions = useMemo<Extension[]>(
    () => [
      EditorView.lineWrapping,
      EditorView.theme(createEditorTheme(palette)),
      lineNumbers(),
      highlightExtension,
      languageCompartment.of([]),
      interactionCompartment.of([]),
    ],
    [highlightExtension, interactionCompartment, languageCompartment, palette],
  );

  useEffect(() => {
    if (!editorView) return;
    editorView.dispatch({
      effects: [
        languageCompartment.reconfigure(
          mode === "json" ? [json(), indentOnInput(), foldGutter()] : [],
        ),
        interactionCompartment.reconfigure([
          autocompletion({
            override: [
              createVariableCompletions(suggestions),
              ...(mode === "json" ? [jsonKeywordCompletions] : []),
            ],
          }),
          createVariableTooltip(suggestions),
        ]),
      ],
    });
  }, [editorView, interactionCompartment, languageCompartment, mode, suggestions]);

  const formatIfNeeded = useCallback(
    (nextValue: string) => {
      if (mode !== "json") return;
      const formatted = tryFormatJson(nextValue);
      if (formatted && formatted !== nextValue) onChange(formatted);
    },
    [mode, onChange],
  );

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/40 bg-background [&_.cm-editor]:h-full [&_.cm-gutters]:min-h-full [&_.cm-scroller]:h-full",
        className,
      )}
    >
      <CodeMirror
        value={value}
        height="100%"
        style={{ height: "100%", minHeight: 0 }}
        basicSetup={{
          foldGutter: false,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
        }}
        extensions={baseExtensions}
        onCreateEditor={(view) => {
          setEditorView(view);
          formatIfNeeded(view.state.doc.toString());
        }}
        onChange={onChange}
        onBlur={() => editorView && formatIfNeeded(editorView.state.doc.toString())}
      />
      {placeholder && !value ? (
        <div className="pointer-events-none absolute inset-0 px-11 py-3 font-mono text-xs text-muted-foreground">
          {placeholder}
        </div>
      ) : null}
    </div>
  );
}

function createVariableCompletions(suggestions: VariableSuggestion[]) {
  return (context: CompletionContext) => {
    const line = context.state.doc.lineAt(context.pos);
    const before = line.text.slice(0, context.pos - line.from);
    const triggerIndex = before.lastIndexOf(TEMPLATE_TRIGGER);
    if (triggerIndex === -1) return null;

    const query = before.slice(triggerIndex + TEMPLATE_TRIGGER.length).toLowerCase();
    const options = suggestions
      .filter(
        (suggestion) =>
          suggestion.path.toLowerCase().includes(query) ||
          suggestion.label.toLowerCase().includes(query),
      )
      .slice(0, 15)
      .map((suggestion) => ({
        label: suggestion.path,
        detail: suggestion.label,
        apply: `${suggestion.path}}}`,
      }));

    if (!options.length) return null;
    return { from: line.from + triggerIndex + TEMPLATE_TRIGGER.length, options };
  };
}

function jsonKeywordCompletions(context: CompletionContext) {
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

function createVariableTooltip(suggestions: VariableSuggestion[]) {
  const suggestionMap = new Map(suggestions.map((suggestion) => [suggestion.path, suggestion]));
  return hoverTooltip((view, pos) => {
    const line = view.state.doc.lineAt(pos);
    const path = getVariableAtRange(line.text, pos - line.from, pos - line.from);
    if (!path) return null;
    const suggestion = path ? suggestionMap.get(path) : undefined;
    if (!suggestion?.resolvedValue) return null;

    const start = line.text.indexOf(`{{${path}}}`);
    const from = start >= 0 ? line.from + start : pos;
    const end = start >= 0 ? from + path.length + 4 : pos;
    const previewValue = suggestion.displayValue ?? suggestion.resolvedValue ?? "";
    return {
      pos: from,
      end,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className =
          "max-w-[22rem] rounded-xl border border-border/50 bg-popover px-3 py-2 text-popover-foreground shadow-xl";
        dom.innerHTML = `<p class="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">${suggestion.label}</p><pre class="mt-2 whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed">${escapeHtml(previewValue)}</pre>`;
        return { dom };
      },
    };
  });
}

function createEditorTheme(palette: typeof lightJsonPalette) {
  return {
    "&": { backgroundColor: "transparent", color: palette.foreground },
    ".cm-editor": { height: "100%" },
    ".cm-content": {
      fontFamily: "var(--font-geist-mono)",
      fontSize: "0.75rem",
      padding: "0.75rem 0.75rem 1rem",
    },
    ".cm-scroller": { overflow: "auto", fontFamily: "var(--font-geist-mono)", minHeight: "100%" },
    ".cm-gutters": {
      backgroundColor: "transparent",
      borderRight: `1px solid ${palette.border}`,
      color: palette.gutter,
    },
    ".cm-gutterElement": { fontSize: "0.6875rem" },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 0.875rem 0 0.625rem" },
    ".cm-activeLine": { backgroundColor: palette.lineHover },
    ".cm-activeLineGutter": { backgroundColor: palette.lineHover, color: palette.gutterActive },
    ".cm-tooltip": {
      border: `1px solid ${palette.border}`,
      backgroundColor: "hsl(var(--background))",
    },
    ".cm-foldGutter .cm-gutterElement": { color: palette.gutter },
  };
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function tryFormatJson(value: string) {
  if (!value.trim()) return null;
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return null;
  }
}
