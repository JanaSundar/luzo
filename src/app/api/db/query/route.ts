import { NextResponse } from "next/server";
import { createDbClient } from "@/lib/db/runtime";

const SELECT_ONLY_REGEX = /^\s*(SELECT|WITH)\b/i;
const DANGEROUS_KEYWORDS = /\b(DROP|TRUNCATE|ALTER|GRANT|REVOKE)\b/i;

/**
 * POST /api/db/query
 * Execute a SQL query via the Database Playground.
 * Default: SELECT-only. Toggle to allow writes.
 */
export async function POST(request: Request) {
  try {
    const { dbUrl, query, allowWrite = false } = await request.json();

    if (!dbUrl || typeof dbUrl !== "string") {
      return NextResponse.json({ error: "dbUrl is required" }, { status: 400 });
    }

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const trimmedQuery = query.trim();

    if (DANGEROUS_KEYWORDS.test(trimmedQuery)) {
      return NextResponse.json(
        {
          error:
            "Dangerous SQL keywords detected (DROP, TRUNCATE, ALTER, GRANT, REVOKE are not allowed)",
        },
        { status: 403 },
      );
    }

    if (!allowWrite && !SELECT_ONLY_REGEX.test(trimmedQuery)) {
      return NextResponse.json(
        {
          error:
            "Only SELECT queries are allowed in read-only mode. Enable write mode to run mutations.",
        },
        { status: 403 },
      );
    }

    const { sql: sqlClient } = createDbClient(dbUrl);
    const start = Date.now();
    const result = await sqlClient.unsafe(trimmedQuery);
    const latencyMs = Date.now() - start;

    const rows = Array.isArray(result) ? result : [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return NextResponse.json({
      rows: rows.slice(0, 500),
      columns,
      rowCount: rows.length,
      latencyMs,
      truncated: rows.length > 500,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed" },
      { status: 500 },
    );
  }
}
