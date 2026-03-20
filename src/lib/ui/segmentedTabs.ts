import { cn } from "@/lib/utils";

/**
 * Track: soft tint on the page — black on light UI, white on dark UI (low alpha).
 */
export const segmentedTabTrackClassName =
  "rounded-lg bg-black/[0.08] p-0.5 gap-0.5 ring-1 ring-black/12 dark:bg-white/[0.1] dark:ring-white/12";

/** Horizontal segmented control (default). */
export const segmentedTabListClassName = cn(
  "flex min-w-0 items-center",
  segmentedTabTrackClassName
);

/** Same surface semantics as the track — for small chips (e.g. PRE / TEST) in light and dark mode. */
export const segmentedSurfaceChipClassName =
  "rounded-md border border-black/12 bg-black/[0.08] text-black dark:border-white/12 dark:bg-white/[0.1] dark:text-white";

/**
 * Active: **inverted** vs the surface — on light bg → solid black + white text; on dark bg → solid white + black text.
 * Inactive: dim black labels on light, dim white labels on dark.
 */
export function segmentedTabTriggerClassName(active: boolean, className?: string) {
  return cn(
    "relative flex min-w-0 min-h-0 items-center justify-center gap-1.5 rounded-md text-[11px] font-semibold transition-colors outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "bg-black text-white shadow-sm dark:bg-white dark:text-black dark:shadow-sm"
      : "text-black/50 hover:bg-black/10 hover:text-black dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white",
    className
  );
}
