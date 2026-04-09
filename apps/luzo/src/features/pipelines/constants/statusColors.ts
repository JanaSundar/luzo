/**
 * Centralised execution-status → colour mappings for pipeline UI.
 * Keeps DebugControlsBar, StepStatusPanel, and any future consumers in sync.
 */

/** Small dot indicator — background class only. */
export const EXECUTION_STATUS_DOT: Record<string, string> = {
  idle: "bg-muted-foreground",
  running: "bg-primary animate-pulse",
  paused: "bg-amber-500",
  completed: "bg-emerald-500",
  error: "bg-destructive",
  aborted: "bg-amber-500",
  interrupted: "bg-amber-500",
};

/** Badge variant — background + text classes. */
export const EXECUTION_STATUS_BADGE: Record<string, string> = {
  idle: "bg-muted text-muted-foreground",
  running: "bg-primary/10 text-primary",
  paused: "bg-amber-500/10 text-amber-600",
  completed: "bg-emerald-500/10 text-emerald-600",
  error: "bg-destructive/10 text-destructive",
  aborted: "bg-amber-500/10 text-amber-600",
  interrupted: "bg-amber-500/10 text-amber-600",
};
