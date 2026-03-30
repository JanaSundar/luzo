"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { animate, useMotionValue } from "motion/react";
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

interface SearchMatch {
  lineNumber: number;
  occurrenceIndexInLine: number;
}

type ScrollSpeedMode = "normal" | "wrap";

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
  const scrollMotionValue = useMotionValue(0);
  const scrollAnimationRef = useRef<{ stop: () => void } | null>(null);
  const scrollSpeedModeRef = useRef<ScrollSpeedMode>("normal");
  const previousIndexRef = useRef(0);

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
    const nextMatches: SearchMatch[] = [];

    for (const line of model.lines) {
      const lineText = line.text.toLowerCase();
      let fromIndex = 0;
      let occurrenceIndexInLine = 0;

      while (fromIndex < lineText.length) {
        const matchIndex = lineText.indexOf(normalizedQuery, fromIndex);
        if (matchIndex === -1) {
          break;
        }

        nextMatches.push({
          lineNumber: line.lineNumber,
          occurrenceIndexInLine,
        });

        occurrenceIndexInLine += 1;
        fromIndex = matchIndex + normalizedQuery.length;
      }
    }

    return nextMatches;
  }, [model.lines, query]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [model.formattedText, query]);

  useEffect(() => {
    const nextIndex = matches.length ? Math.min(currentIndex, matches.length - 1) : 0;
    onMatchChange?.(matches.length, nextIndex);
  }, [currentIndex, matches.length, onMatchChange]);

  const itemSize = LINE_HEIGHTS[fontScale as keyof typeof LINE_HEIGHTS] || LINE_HEIGHTS.md;
  const matchedLines = useMemo(() => new Set(matches.map((match) => match.lineNumber)), [matches]);
  const activeMatch = matches[currentIndex] ?? null;
  const activeLineNumber = activeMatch?.lineNumber ?? null;

  useEffect(() => {
    const unsubscribe = scrollMotionValue.on("change", (value) => {
      if (parentRef.current) {
        parentRef.current.scrollTop = value;
      }
    });

    return unsubscribe;
  }, [scrollMotionValue]);

  const rowVirtualizer = useVirtualizer({
    count: model.lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemSize,
    overscan: 10,
    scrollToFn: (offset, { adjustments, behavior }, instance) => {
      const scrollElement = instance.scrollElement;
      if (!scrollElement || !(scrollElement instanceof Element)) return;

      const targetOffset = Math.max(0, offset + (adjustments ?? 0));

      scrollAnimationRef.current?.stop();
      scrollAnimationRef.current = null;
      scrollMotionValue.set(scrollElement.scrollTop);

      if (behavior !== "smooth") {
        scrollMotionValue.set(targetOffset);
        scrollElement.scrollTop = targetOffset;
        return;
      }

      scrollAnimationRef.current = animate(
        scrollMotionValue,
        targetOffset,
        getScrollTransition({
          startOffset: scrollElement.scrollTop,
          targetOffset,
          speedMode: scrollSpeedModeRef.current,
        }),
      );
    },
  });

  useEffect(() => {
    if (!activeLineNumber) return;

    const previousIndex = previousIndexRef.current;
    const isWrapAround =
      matches.length > 1 &&
      ((previousIndex === matches.length - 1 && currentIndex === 0) ||
        (previousIndex === 0 && currentIndex === matches.length - 1));

    scrollSpeedModeRef.current = isWrapAround ? "wrap" : "normal";
    previousIndexRef.current = currentIndex;

    const targetIndex = activeLineNumber - 1;
    const align =
      targetIndex <= 1
        ? "start"
        : targetIndex >= Math.max(model.lines.length - 2, 0)
          ? "end"
          : "center";

    rowVirtualizer.scrollToIndex(targetIndex, {
      align,
      behavior: "smooth",
    });
  }, [activeLineNumber, currentIndex, matches.length, model.lines.length, rowVirtualizer]);

  useEffect(
    () => () => {
      scrollAnimationRef.current?.stop();
    },
    [],
  );

  const goNext = () =>
    setCurrentIndex((prev) => (matches.length ? (prev + 1) % matches.length : 0));
  const goPrev = () =>
    setCurrentIndex((prev) => (matches.length ? (prev - 1 + matches.length) % matches.length : 0));

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
            aria-label="Previous match"
            className="rounded p-0.5 disabled:opacity-40"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={matches.length < 2}
            aria-label="Next match"
            className="rounded p-0.5 disabled:opacity-40"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div
        ref={parentRef}
        className="h-full overflow-auto pb-3 pt-4 no-scrollbar"
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

              const isActive = activeLineNumber === line.lineNumber;
              const isMatch = matchedLines.has(line.lineNumber);
              const activeOccurrenceIndexInLine =
                activeMatch?.lineNumber === line.lineNumber
                  ? activeMatch.occurrenceIndexInLine
                  : null;

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
                      activeOccurrenceIndexInLine,
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
  activeOccurrenceIndexInLine: number | null,
  fallback = "",
) {
  if (!tokens?.length) {
    return highlightFragments({
      text: fallback,
      query,
      palette,
      activeOccurrenceIndexInLine,
      occurrenceOffset: 0,
    }).fragments;
  }

  let occurrenceOffset = 0;

  return tokens.map((token, index) => {
    const { fragments, nextOccurrenceOffset } = highlightFragments({
      text: token.content,
      query,
      palette,
      activeOccurrenceIndexInLine,
      occurrenceOffset,
    });

    occurrenceOffset = nextOccurrenceOffset;

    return (
      <span key={`${token.content}-${index}`} style={{ color: token.color ?? palette.foreground }}>
        {fragments}
      </span>
    );
  });
}

function highlightFragments({
  text,
  query,
  palette,
  activeOccurrenceIndexInLine,
  occurrenceOffset,
}: {
  text: string;
  query: string;
  palette: typeof lightJsonPalette;
  activeOccurrenceIndexInLine: number | null;
  occurrenceOffset: number;
}) {
  if (!query) {
    return { fragments: text, nextOccurrenceOffset: occurrenceOffset };
  }

  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
  let nextOccurrenceOffset = occurrenceOffset;

  return {
    fragments: parts.map((part, index) => {
      if (part.toLowerCase() !== query.toLowerCase()) {
        return part;
      }

      const isActive = activeOccurrenceIndexInLine === nextOccurrenceOffset;
      nextOccurrenceOffset += 1;

      return (
        <mark
          key={`${part}-${index}`}
          className="px-0 text-current"
          style={{ background: isActive ? palette.searchActive : palette.search }}
        >
          {part}
        </mark>
      );
    }),
    nextOccurrenceOffset,
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getScrollTransition({
  startOffset,
  targetOffset,
  speedMode,
}: {
  startOffset: number;
  targetOffset: number;
  speedMode: ScrollSpeedMode;
}) {
  const totalDistance = Math.abs(targetOffset - startOffset);
  const nearDistanceRatio = Math.min(totalDistance / 240, 1);
  const duration = speedMode === "wrap" ? 0.24 : 0.34 + (1 - nearDistanceRatio) * 0.14;

  return {
    type: "tween" as const,
    duration,
    ease:
      speedMode === "wrap"
        ? ([0.22, 1, 0.3, 1] as [number, number, number, number])
        : ([0.2, 0.7, 0.24, 1] as [number, number, number, number]),
  };
}
