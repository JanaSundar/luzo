import { cn } from "@/lib/utils";

/** Text colors for HTTP verbs — matches API-tool style (GET blue, POST primary, PATCH amber). */
export function httpMethodTextClass(method: string): string {
  switch (method) {
    case "GET":
      return "text-blue-600 dark:text-blue-400";
    case "POST":
      return "text-foreground font-semibold";
    case "PATCH":
      return "text-amber-700 dark:text-amber-500";
    case "PUT":
      return "text-orange-600 dark:text-orange-400";
    case "DELETE":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-muted-foreground";
  }
}

/** Expanded history row: verb color only, no gray/colored pill. */
export function httpMethodPlainExpandedClass(method: string): string {
  return cn(
    "inline-flex min-w-[2.75rem] shrink-0 justify-start text-[9px] font-bold uppercase tracking-wide tabular-nums leading-none",
    httpMethodTextClass(method),
  );
}

export function httpMethodBadgeClass(method: string, options?: { naturalWidth?: boolean }): string {
  const natural = options?.naturalWidth === true;
  return cn(
    "inline-flex shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide tabular-nums",
    natural ? "min-w-0 w-fit justify-start" : "min-w-[2.75rem] justify-center",
    method === "GET" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    method === "POST" && "bg-muted text-foreground",
    method === "PATCH" && "bg-amber-500/15 text-amber-800 dark:text-amber-400",
    method === "PUT" && "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    method === "DELETE" && "bg-red-500/10 text-red-600 dark:text-red-400",
    !["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method) &&
      "bg-muted/50 text-muted-foreground",
  );
}

/** First letter only (e.g. G vs P); color distinguishes POST vs PATCH. */
export function httpMethodLetter(method: string): string {
  const t = method.trim();
  return t ? t.charAt(0).toUpperCase() : "?";
}

/** Letter only, no background (e.g. history in collapsed sidebar). */
export function httpMethodLetterBareClass(method: string): string {
  return cn(
    "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold leading-none tabular-nums",
    httpMethodTextClass(method),
  );
}

/** Compact letter chip for collapsed sidebar rail. */
export function httpMethodLetterClass(method: string): string {
  const m = method.toUpperCase();
  return cn(
    "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold leading-none tabular-nums",
    m === "GET" && "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    m === "POST" && "bg-muted text-foreground",
    m === "PATCH" && "bg-amber-500/15 text-amber-800 dark:text-amber-400",
    m === "PUT" && "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    m === "DELETE" && "bg-red-500/10 text-red-600 dark:text-red-400",
    !["GET", "POST", "PATCH", "PUT", "DELETE"].includes(m) && "bg-muted/50 text-muted-foreground",
  );
}
