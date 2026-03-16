"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { JsonColorized } from "@/components/playground/JsonColorized";
import { cn } from "@/lib/utils";

function tryFormatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export interface JsonResponseViewerProps {
  /** Raw response body (string). If valid JSON, will be parsed and formatted. */
  text: string;
  /** Search query to highlight in the JSON. */
  searchQuery?: string;
  /** Called when match count or current index changes (e.g. after search or prev/next). */
  onMatchChange?: (matchCount: number, currentIndex: number) => void;
  className?: string;
}

export interface JsonResponseViewerRef {
  goNext: () => void;
  goPrev: () => void;
}

export const JsonResponseViewer = forwardRef<JsonResponseViewerRef, JsonResponseViewerProps>(
  function JsonResponseViewer({ text, searchQuery = "", onMatchChange, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const formatted = useMemo(() => tryFormatJson(text), [text]);

    useEffect(() => {
      setCurrentIndex(0);
    }, []);

    useEffect(() => {
      if (!searchQuery.trim()) {
        onMatchChange?.(0, 0);
        return;
      }
      const el = containerRef.current;
      if (!el) return;
      const marks = el.querySelectorAll("mark");
      const count = marks.length;
      onMatchChange?.(count, currentIndex);
    }, [searchQuery, currentIndex, onMatchChange]);

    const scrollToMatch = useCallback(
      (index: number) => {
        const el = containerRef.current;
        if (!el) return;
        const marks = el.querySelectorAll("mark");
        if (marks.length === 0) return;
        const safeIndex = Math.max(0, Math.min(index, marks.length - 1));
        setCurrentIndex(safeIndex);
        marks[safeIndex].scrollIntoView({ block: "center", behavior: "smooth" });
        onMatchChange?.(marks.length, safeIndex);
      },
      [onMatchChange]
    );

    const goNext = useCallback(() => {
      const el = containerRef.current;
      if (!el) return;
      const marks = el.querySelectorAll("mark");
      if (marks.length === 0) return;
      const next = Math.min(currentIndex + 1, marks.length - 1);
      scrollToMatch(next);
    }, [currentIndex, scrollToMatch]);

    const goPrev = useCallback(() => {
      const prev = Math.max(currentIndex - 1, 0);
      scrollToMatch(prev);
    }, [currentIndex, scrollToMatch]);

    useImperativeHandle(
      ref,
      () => ({
        goNext,
        goPrev,
      }),
      [goNext, goPrev]
    );

    return (
      <div
        ref={containerRef}
        className={cn(
          "flex-1 min-h-0 overflow-auto rounded-md border border-border/40 bg-background p-4",
          className
        )}
      >
        <pre className="m-0 text-xs leading-relaxed">
          <JsonColorized text={formatted} highlight={searchQuery || undefined} />
        </pre>
      </div>
    );
  }
);
