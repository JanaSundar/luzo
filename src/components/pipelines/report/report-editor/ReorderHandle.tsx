"use client";

import { GripVertical } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";

interface ReorderHandleProps {
  label: string;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

export function ReorderHandle({ label, onPointerDown }: ReorderHandleProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/40 bg-background/90 text-muted-foreground transition-colors hover:bg-muted"
      onPointerDown={onPointerDown}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}
