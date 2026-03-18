/**
 * Derive a unique report title from pipeline execution results (API URLs).
 */

interface ResultWithUrl {
  method: string;
  url: string;
}

export function deriveReportTitle(results: ResultWithUrl[]): string {
  if (results.length === 0) return "API Report";
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const r of results) {
    try {
      const u = new URL(r.url);
      const key = `${r.method} ${u.pathname || "/"}`;
      if (!seen.has(key)) {
        seen.add(key);
        parts.push(`${r.method} ${u.pathname || "/"}`);
      }
    } catch {
      const key = `${r.method} ${r.url}`;
      if (!seen.has(key)) {
        seen.add(key);
        parts.push(`${r.method} ${r.url}`);
      }
    }
  }
  if (parts.length === 0) return "API Report";
  if (parts.length === 1) return `API Report - ${parts[0]}`;
  return `API Report - ${parts.slice(0, 3).join(", ")}${parts.length > 3 ? ` (+${parts.length - 3} more)` : ""}`;
}
