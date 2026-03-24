import type { TimelineEventStatus } from "@/types/timeline-event";

// ─── Color classes ──────────────────────────────────────────────────
// Single source of truth for status → visual mapping.
// Eliminates duplicate status styling across the debugger timeline.

export interface StatusVisual {
  /** Lucide icon name (rendered by consumer) */
  icon: StatusIcon;
  /** Tailwind text color class */
  color: string;
  /** Tailwind background color class (for badges / dots) */
  bgColor: string;
  /** Human-readable label */
  label: string;
  /** Whether this status should pulse/animate */
  animated: boolean;
}

export type StatusIcon =
  | "circle"
  | "circle-dot"
  | "check-circle"
  | "x-circle"
  | "pause"
  | "rotate-ccw"
  | "skip-forward"
  | "loader";

const STATUS_MAP: Record<TimelineEventStatus, StatusVisual> = {
  queued: {
    icon: "circle",
    color: "text-muted-foreground",
    bgColor: "bg-muted-foreground",
    label: "Queued",
    animated: false,
  },
  ready: {
    icon: "circle-dot",
    color: "text-blue-500",
    bgColor: "bg-blue-500",
    label: "Ready",
    animated: false,
  },
  running: {
    icon: "loader",
    color: "text-primary",
    bgColor: "bg-primary",
    label: "Running",
    animated: true,
  },
  paused: {
    icon: "pause",
    color: "text-amber-500",
    bgColor: "bg-amber-500",
    label: "Paused",
    animated: false,
  },
  completed: {
    icon: "check-circle",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500",
    label: "Completed",
    animated: false,
  },
  failed: {
    icon: "x-circle",
    color: "text-destructive",
    bgColor: "bg-destructive",
    label: "Failed",
    animated: false,
  },
  retried: {
    icon: "rotate-ccw",
    color: "text-amber-500",
    bgColor: "bg-amber-500",
    label: "Retried",
    animated: false,
  },
  skipped: {
    icon: "skip-forward",
    color: "text-muted-foreground/60",
    bgColor: "bg-muted-foreground/60",
    label: "Skipped",
    animated: false,
  },
};

/** O(1) lookup — returns visual config for a timeline event status */
export function getStatusVisual(status: TimelineEventStatus): StatusVisual {
  return STATUS_MAP[status];
}

// ── Debug-level status (controller status → label) ──────────────────
export type DebugPanelState = "empty" | "loading" | "live" | "done" | "error";

const HTTP_STATUS_COLORS: Record<string, string> = {
  "2xx": "text-emerald-600",
  "3xx": "text-blue-600",
  "4xx": "text-amber-600",
  "5xx": "text-destructive",
};

/** Returns a Tailwind text color class for an HTTP status code */
export function getHttpStatusColor(status: number): string {
  if (status >= 200 && status < 300) return HTTP_STATUS_COLORS["2xx"]!;
  if (status >= 300 && status < 400) return HTTP_STATUS_COLORS["3xx"]!;
  if (status >= 400 && status < 500) return HTTP_STATUS_COLORS["4xx"]!;
  if (status >= 500) return HTTP_STATUS_COLORS["5xx"]!;
  return "text-muted-foreground";
}
