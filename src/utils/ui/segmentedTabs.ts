import { cn } from "@/utils";

export const segmentedTabTrackClassName =
  "gap-1 rounded-full border border-border/50 bg-background/55 p-1 shadow-[0_1px_2px_rgba(15,23,42,0.05)] backdrop-blur-md supports-[backdrop-filter]:bg-background/45 dark:bg-background/35 dark:shadow-[0_1px_2px_rgba(2,6,23,0.3)]";

export const segmentedTabListClassName = cn(
  "flex min-w-0 items-center",
  segmentedTabTrackClassName,
);

/** Same surface semantics as the track — for small chips (e.g. PRE / TEST) in light and dark mode. */
export const segmentedSurfaceChipClassName =
  "rounded-full border border-border/45 bg-background/70 text-foreground backdrop-blur-sm";

export function segmentedTabBadgeClassName(active: boolean) {
  return cn(
    "flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-semibold leading-none transition-colors",
    active
      ? "bg-background text-foreground ring-1 ring-border/70"
      : "bg-muted/70 text-muted-foreground",
  );
}

export function segmentedTabTriggerClassName(active: boolean, className?: string) {
  return cn(
    "relative flex min-w-0 min-h-0 items-center justify-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition-[color,background-color,border-color] duration-150 ease-out outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "border-border/70 bg-background text-foreground font-bold shadow-[0_1px_2px_rgba(15,23,42,0.08),0_0_0_1px_rgba(255,255,255,0.06)_inset] dark:border-white/10 dark:shadow-[0_1px_2px_rgba(2,6,23,0.22),0_0_0_1px_rgba(255,255,255,0.12)_inset]"
      : "border-transparent text-foreground/65 hover:border-border/45 hover:bg-background/66 hover:text-foreground dark:text-white/65 dark:hover:border-white/10 dark:hover:bg-background/52 dark:hover:text-white",
    className,
  );
}
