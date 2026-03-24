"use client";

import { Clock } from "lucide-react";

// ─── Panel state renderers ──────────────────────────────────────────
// Replaces inline EmptyStreamState from DebuggerShell.tsx.
// Each state is a focused component — composable and testable.

export function TimelineEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <div className="rounded-full bg-muted/30 p-4">
        <Clock className="h-8 w-8 opacity-20" />
      </div>
      <p className="text-sm">Run a pipeline to see the execution timeline</p>
      <p className="text-xs text-muted-foreground">Use Debug mode for step-by-step execution</p>
    </div>
  );
}

export function TimelineLoading() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm">Starting execution…</p>
    </div>
  );
}

export function TimelineError({ message }: { message?: string | null }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
      <div className="rounded-full bg-destructive/10 p-3">
        <span className="text-destructive text-lg">✕</span>
      </div>
      <p className="text-sm font-medium text-destructive">Execution failed</p>
      {message && <p className="max-w-md text-xs text-muted-foreground break-all">{message}</p>}
    </div>
  );
}
