"use client";

import type { MouseEventHandler, ReactNode } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import type { VariableSuggestion } from "@/types/pipeline-debug";

export function VariableValuePreview({
  children,
  suggestion,
  onMouseDown,
  className,
}: {
  children: ReactNode;
  suggestion?: VariableSuggestion;
  onMouseDown?: MouseEventHandler<HTMLSpanElement>;
  className?: string;
}) {
  if (!suggestion?.resolvedValue) {
    return (
      <span onMouseDown={onMouseDown} className={className}>
        {children}
      </span>
    );
  }

  return (
    <HoverCard>
      <HoverCardTrigger
        onMouseDown={onMouseDown}
        className={cn("rounded-sm underline decoration-dotted underline-offset-2", className)}
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-72 border border-border/50 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {suggestion.label}
        </p>
        <p className="mt-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
          {suggestion.displayValue ?? suggestion.resolvedValue}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
