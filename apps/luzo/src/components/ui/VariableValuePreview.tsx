"use client";

import type { MouseEventHandler, ReactNode } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/utils";
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
  const baseClasses = cn("rounded-sm transition-colors duration-150", "text-foreground", className);

  if (!suggestion?.resolvedValue) {
    return (
      <span onMouseDown={onMouseDown} className={cn(baseClasses, "cursor-default")}>
        {children}
      </span>
    );
  }

  return (
    <HoverCard>
      <HoverCardTrigger
        onMouseDown={onMouseDown}
        className={cn(
          baseClasses,
          "cursor-pointer underline decoration-dotted underline-offset-4 decoration-current/30 hover:decoration-current",
        )}
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-72 border border-border/50 bg-popover/90 p-3 backdrop-blur-md shadow-xl"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/70">
              {suggestion.label || "Variable"}
            </p>
          </div>
          <p className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all text-foreground/90">
            {suggestion.displayValue ?? suggestion.resolvedValue}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
