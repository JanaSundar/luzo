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
import { List, type ListImperativeAPI, type RowComponentProps } from "react-window";
import { JsonLine, useJsonLines } from "@/components/playground/JsonColorized";
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
  function JsonResponseViewer(props, ref) {
    const { text, searchQuery = "", onMatchChange, className } = props;
    const [currentIndex, setCurrentIndex] = useState(0);
    const formatted = useMemo(() => tryFormatJson(text), [text]);

    // Track previous text/searchQuery to reset index when they change
    const [prevParams, setPrevParams] = useState({ text, searchQuery });
    if (prevParams.text !== text || prevParams.searchQuery !== searchQuery) {
      setPrevParams({ text, searchQuery });
      setCurrentIndex(0);
    }

    const lines = useJsonLines(formatted);
    const listRef = useRef<ListImperativeAPI>(null);

    const matchCount = useMemo(() => {
      if (!searchQuery.trim()) return 0;
      const regex = new RegExp(escapeRegex(searchQuery), "gi");
      const matches = formatted.match(regex);
      return matches?.length || 0;
    }, [formatted, searchQuery]);

    const Row = useCallback(
      ({ index, style }: RowComponentProps) => {
        return <JsonLine line={lines[index]} highlight={searchQuery} style={style} />;
      },
      [lines, searchQuery]
    );

    useEffect(() => {
      onMatchChange?.(matchCount, currentIndex);
    }, [matchCount, currentIndex, onMatchChange]);

    const goNext = useCallback(() => {
      setCurrentIndex((prev) => (matchCount > 0 ? (prev + 1) % matchCount : 0));
    }, [matchCount]);

    const goPrev = useCallback(() => {
      setCurrentIndex((prev) => (matchCount > 0 ? (prev - 1 + matchCount) % matchCount : 0));
    }, [matchCount]);

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
        className={cn(
          "h-full w-full min-h-0 min-w-0 overflow-hidden rounded-md border border-border/40 bg-background",
          className
        )}
      >
        <List
          listRef={listRef}
          style={{ height: 500, width: "100%" }}
          rowCount={lines.length}
          rowHeight={20}
          rowComponent={Row}
          rowProps={{}}
          className="custom-scrollbar"
        />
      </div>
    );
  }
);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
