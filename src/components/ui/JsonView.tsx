"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "next-themes";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { codeToTokens, type ThemedToken } from "shiki";
import {
  type JsonDocumentModel,
  type JsonLineMeta,
  type JsonNodeMeta,
} from "@/features/json-view/buildJsonDocument";
import type { Result } from "@/types/worker-results";
import type { JsonWorkerApi } from "@/types/workers";
import {
  darkJsonPalette,
  darkJsonTheme,
  lightJsonPalette,
  lightJsonTheme,
} from "@/features/json-view/theme";
import { cn } from "@/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { jsonWorkerClient } from "@/workers/client/json-client";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export interface JsonViewProps {
  text: string;
  searchQuery?: string;
  onMatchChange?: (matchCount: number, currentIndex: number) => void;
  className?: string;
  fontScale?: "sm" | "md" | "lg";
  format?: boolean;
}

export interface JsonViewRef {
  goNext: () => void;
  goPrev: () => void;
}

const LINE_HEIGHTS = {
  sm: 20,
  md: 24,
  lg: 28,
};

export const JsonView = forwardRef<JsonViewRef, JsonViewProps>(function JsonView(
  { text, searchQuery = "", onMatchChange, className, fontScale = "md", format = true },
  ref,
) {
  const { resolvedTheme } = useTheme();
  const activeTheme = resolvedTheme === "light" ? "light" : "dark";
  const palette = activeTheme === "dark" ? darkJsonPalette : lightJsonPalette;
  const theme = activeTheme === "dark" ? darkJsonTheme : lightJsonTheme;

  const [model, setModel] = useState(() =>
    format ? { formattedText: "", lines: [], nodes: {} } : createPlainDocument(text),
  );
  const [isProcessing, setIsProcessing] = useState(true);
  const [tokenLines, setTokenLines] = useState<ThemedToken[][]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const query = searchQuery.trim();
  const parentRef = useRef<HTMLDivElement>(null);

  const clientId = useState(() => crypto.randomUUID())[0];

  // 1. Model Preparation (Worker or Local)
  useEffect(() => {
    let cancelled = false;
    setIsProcessing(true);

    if (!format) {
      setModel(createPlainDocument(text));
      return;
    }

    const process = async () => {
      const res = await jsonWorkerClient.callLatest<Result<JsonDocumentModel | null>>(
        `json-${clientId}`,
        async (api: JsonWorkerApi) => api.tryBuildJsonDocument({ text }),
      );

      if (!cancelled) {
        if (res?.ok) {
          setModel(res.data ?? createPlainDocument(text));
        } else {
          setModel(createPlainDocument(text));
        }
      }
    };

    void process();

    return () => {
      cancelled = true;
    };
  }, [text, format]);

  useEffect(() => {
    let cancelled = false;

    void codeToTokens(model.formattedText, { lang: "json", theme })
      .then((result) => {
        if (!cancelled) {
          setTokenLines(result.tokens);
          setIsProcessing(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTokenLines([]);
          setIsProcessing(false);
        }
      });

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

  const itemSize = LINE_HEIGHTS[fontScale as keyof typeof LINE_HEIGHTS] || LINE_HEIGHTS.md;

  const rowVirtualizer = useVirtualizer({
    count: model.lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemSize,
    overscan: 10,
  });

  useEffect(() => {
    const activeMatch = matches[currentIndex];
    if (!activeMatch) return;
    rowVirtualizer.scrollToIndex(activeMatch.lineNumber - 1, { align: "center" });
  }, [currentIndex, matches, rowVirtualizer]);

  const goNext = () =>
    setCurrentIndex((prev) => (matches.length ? (prev + 1) % matches.length : 0));
  const goPrev = () =>
    setCurrentIndex((prev) => (matches.length ? (prev - 1 + matches.length) % matches.length : 0));
  const matchedLines = useMemo(() => new Set(matches.map((match) => match.lineNumber)), [matches]);

  useImperativeHandle(ref, () => ({ goNext, goPrev }), [matches.length]);

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden bg-background", className)}>
      {isProcessing ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
          <LoadingSpinner size="lg" variant="dots" />
        </div>
      ) : null}

      {query && !isProcessing ? (
        <div
          className="absolute top-2 right-2 z-20 flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] shadow-sm"
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

      <div
        ref={parentRef}
        className="h-full overflow-auto pb-3 pt-4 scroll-smooth no-scrollbar"
        style={{
          fontSize: fontScale === "sm" ? "11px" : fontScale === "lg" ? "13px" : "12px",
          lineHeight: fontScale === "sm" ? "1.25rem" : fontScale === "lg" ? "1.75rem" : "1.5rem",
        }}
      >
        <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
          {!isProcessing && format ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-13 w-px z-10"
              style={{ backgroundColor: palette.border }}
            />
          ) : null}
          {(!isProcessing || !format) &&
            rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const line = model.lines[virtualItem.index];
              if (!line) return null;

              const isActive = matches[currentIndex]?.lineNumber === line.lineNumber;
              const isMatch = matchedLines.has(line.lineNumber);

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                    background: isActive ? palette.lineHover : "transparent",
                  }}
                  className={cn(
                    "grid items-start gap-0 px-3 py-0.5 font-mono",
                    format ? "grid-cols-[2.5rem_minmax(0,1fr)]" : "grid-cols-1",
                  )}
                >
                  {format && (
                    <span
                      className="select-none pr-1.5 text-right tabular-nums"
                      style={{ color: isActive ? palette.gutterActive : palette.gutter }}
                    >
                      {line.lineNumber}
                    </span>
                  )}
                  <div
                    className={cn(
                      "min-w-0 whitespace-pre-wrap wrap-anywhere",
                      format && "pl-1.5",
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
  return { formattedText: text, lines, nodes: {} as Record<string, JsonNodeMeta> };
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
