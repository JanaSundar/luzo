/** Short relative label for ISO timestamps (e.g. history "last run"). */
export function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return "";
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
