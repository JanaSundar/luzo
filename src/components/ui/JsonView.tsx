"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "next-themes";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { codeToTokens, type ThemedToken } from "shiki";
import { tryBuildJsonDocument, type JsonLineMeta } from "@/lib/json-view/buildJsonDocument";
import {
  darkJsonPalette,
  darkJsonTheme,
  lightJsonPalette,
  lightJsonTheme,
} from "@/lib/json-view/theme";
import { cn } from "@/lib/utils";

export interface JsonViewProps {
  text: string;
  searchQuery?: string;
  onMatchChange?: (matchCount: number, currentIndex: number) => void;
  className?: string;
  fontScale?: "sm" | "md" | "lg";
}

export interface JsonViewRef {
  goNext: () => void;
  goPrev: () => void;
}

export const JsonView = forwardRef<JsonViewRef, JsonViewProps>(function JsonView(
  { text, searchQuery = "", onMatchChange, className, fontScale = "md" },
  ref,
) {
  const { resolvedTheme } = useTheme();
  const activeTheme = resolvedTheme === "light" ? "light" : "dark";
  const palette = activeTheme === "dark" ? darkJsonPalette : lightJsonPalette;
  const theme = activeTheme === "dark" ? darkJsonTheme : lightJsonTheme;
  const model = useMemo(() => tryBuildJsonDocument(text) ?? createPlainDocument(text), [text]);
  const [tokenLines, setTokenLines] = useState<ThemedToken[][]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const query = searchQuery.trim();
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const fontSizeClass = {
    sm: "text-[11px] leading-5",
    md: "text-xs leading-6",
    lg: "text-[13px] leading-7",
  }[fontScale];

  useEffect(() => {
    let cancelled = false;
    void codeToTokens(model.formattedText, { lang: "json", theme })
      .then((result) => !cancelled && setTokenLines(result.tokens))
      .catch(() => !cancelled && setTokenLines([]));
    return () => {
      cancelled = true;
    };
  }, [model.formattedText, theme]);

  const matches = useMemo(() => {
    if (!query) return [];
    const normalizedQuery = query.toLowerCase();
    return model.lines.filter((line) => line.searchText.toLowerCase().includes(normalizedQuery));
  }, [model.lines, query]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [model.formattedText, query]);

  useEffect(() => {
    const nextIndex = matches.length ? Math.min(currentIndex, matches.length - 1) : 0;
    onMatchChange?.(matches.length, nextIndex);
  }, [currentIndex, matches.length, onMatchChange]);

  useEffect(() => {
    const activeMatch = matches[currentIndex];
    if (!activeMatch) return;

    requestAnimationFrame(() => {
      lineRefs.current[activeMatch.lineNumber]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [currentIndex, matches]);

  const goNext = () =>
    setCurrentIndex((prev) => (matches.length ? (prev + 1) % matches.length : 0));
  const goPrev = () =>
    setCurrentIndex((prev) => (matches.length ? (prev - 1 + matches.length) % matches.length : 0));
  const matchedLines = useMemo(() => new Set(matches.map((match) => match.lineNumber)), [matches]);

  useImperativeHandle(ref, () => ({ goNext, goPrev }), [matches.length]);

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden bg-background", className)}>
      {query ? (
        <div
          className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] shadow-sm"
          style={{
            background: "hsl(var(--background))",
            borderColor: palette.border,
            color: palette.gutter,
          }}
        >
          <span className="min-w-10 text-center tabular-nums">
            {matches.length ? `${currentIndex + 1}/${matches.length}` : "0/0"}
          </span>
          <button
            type="button"
            onClick={goPrev}
            disabled={matches.length < 2}
            className="rounded p-0.5 disabled:opacity-40"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={matches.length < 2}
            className="rounded p-0.5 disabled:opacity-40"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="h-full overflow-y-auto overflow-x-hidden pb-3 pt-4">
        <div className="relative min-h-full">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-13 w-px"
            style={{ backgroundColor: palette.border }}
          />
          {model.lines.map((line) => {
            const isActive = matches[currentIndex]?.lineNumber === line.lineNumber;
            const isMatch = matchedLines.has(line.lineNumber);

            return (
              <div
                key={`${line.lineNumber}-line`}
                ref={(nodeRef) => {
                  lineRefs.current[line.lineNumber] = nodeRef;
                }}
                className={cn(
                  "grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-0 px-3 py-0.5 font-mono",
                  fontSizeClass,
                )}
                style={{ background: isActive ? palette.lineHover : "transparent" }}
              >
                <span
                  className="select-none pr-1.5 text-right tabular-nums"
                  style={{ color: isActive ? palette.gutterActive : palette.gutter }}
                >
                  {line.lineNumber}
                </span>
                <div
                  className={cn(
                    "min-w-0 pl-1.5 whitespace-pre-wrap wrap-anywhere",
                    isMatch && "font-medium",
                  )}
                  style={{ color: palette.foreground }}
                >
                  {renderTokens(
                    tokenLines[line.lineNumber - 1],
                    query,
                    palette,
                    isActive,
                    line.text,
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

function createPlainDocument(text: string) {
  const lines: JsonLineMeta[] = text.split("\n").map((line, index) => ({
    lineNumber: index + 1,
    text: line,
    path: `$[${index}]`,
    ancestors: [] as string[],
    searchText: line,
  }));
  return { formattedText: text, lines, nodes: {} as Record<string, never> };
}

function renderTokens(
  tokens: ThemedToken[] | undefined,
  query: string,
  palette: typeof lightJsonPalette,
  isActive: boolean,
  fallback = "",
) {
  if (!tokens?.length) return highlightFragments(fallback, query, palette, isActive);
  return tokens.map((token, index) => (
    <span key={`${token.content}-${index}`} style={{ color: token.color ?? palette.foreground }}>
      {highlightFragments(token.content, query, palette, isActive)}
    </span>
  ));
}

function highlightFragments(
  text: string,
  query: string,
  palette: typeof lightJsonPalette,
  isActive: boolean,
) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={`${part}-${index}`}
        className="px-0 text-current"
        style={{ background: isActive ? palette.searchActive : palette.search }}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
