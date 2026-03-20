import type { SavedRequest } from "@/types";

export type HistoryDayBucket = "today" | "yesterday" | "older";

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function getHistoryDayBucket(iso: string): HistoryDayBucket {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "older";
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const yesterdayStart = todayStart - 86400000;
  if (t >= todayStart) return "today";
  if (t >= yesterdayStart) return "yesterday";
  return "older";
}

const ORDER: HistoryDayBucket[] = ["today", "yesterday", "older"];
const LABEL: Record<HistoryDayBucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  older: "Earlier",
};

export function groupSavedRequestsByDay<T extends Pick<SavedRequest, "updatedAt">>(
  items: T[]
): { bucket: HistoryDayBucket; label: string; items: T[] }[] {
  const buckets: Record<HistoryDayBucket, T[]> = {
    today: [],
    yesterday: [],
    older: [],
  };
  for (const item of items) {
    buckets[getHistoryDayBucket(item.updatedAt)].push(item);
  }
  return ORDER.filter((b) => buckets[b].length > 0).map((bucket) => ({
    bucket,
    label: LABEL[bucket],
    items: buckets[bucket],
  }));
}
