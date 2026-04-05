// ─── Formatting utilities for timeline display ─────────────────────
// Pure functions — no side effects, trivially testable.
// Shared timeline formatting helpers.

/**
 * Formats milliseconds into a human-readable duration string.
 * Examples: "0ms", "123ms", "1.2s", "1m 23s"
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;

  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Formats bytes into a compact size string.
 * Examples: "20b", "1.5kb", "2.3mb"
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes}b`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}kb`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
}

/**
 * Formats an epoch timestamp into a short time string (HH:MM:SS.mmm).
 * Uses local timezone.
 */
export function formatTimestamp(epoch: number | null | undefined): string {
  if (epoch == null) return "—";
  const date = new Date(epoch);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const millis = String(date.getMilliseconds()).padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${millis}`;
}

/**
 * Computes duration in ms between two epoch timestamps.
 * Returns null if either value is missing.
 */
export function computeDuration(
  startedAt: number | null | undefined,
  endedAt: number | null | undefined,
): number | null {
  if (startedAt == null || endedAt == null) return null;
  return Math.max(0, endedAt - startedAt);
}
