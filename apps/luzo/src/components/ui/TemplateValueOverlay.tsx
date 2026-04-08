"use client";

import { type MouseEventHandler, useMemo } from "react";
import { VariableValuePreview } from "@/components/ui/VariableValuePreview";
import { parseTemplateSegments } from "@/utils/templateTokens";
import { cn } from "@/utils";
import type { VariableSuggestion } from "@/types/pipeline-debug";

export function TemplateValueOverlay({
  value,
  suggestions,
  className,
  onVariableMouseDown,
}: {
  value: string;
  suggestions: VariableSuggestion[];
  className?: string;
  onVariableMouseDown?: MouseEventHandler<HTMLSpanElement>;
}) {
  const segments = useMemo(() => parseTemplateSegments(value), [value]);
  const suggestionMap = useMemo(
    () => new Map(suggestions.map((suggestion) => [suggestion.path, suggestion])),
    [suggestions],
  );

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {segments.map((segment, index) =>
        segment.type === "variable" ? (
          <span key={`${segment.value}-${index}`} className="pointer-events-auto">
            <VariableValuePreview
              suggestion={segment.path ? suggestionMap.get(segment.path) : undefined}
              onMouseDown={onVariableMouseDown}
              className="text-foreground/90"
            >
              {segment.value}
            </VariableValuePreview>
          </span>
        ) : (
          <span key={`${segment.value}-${index}`}>{segment.value}</span>
        ),
      )}
    </div>
  );
}
