import { NextResponse } from "next/server";
import { createDbClient } from "@/services/db/runtime";
import { logger } from "@/utils/logger";

/**
 * POST /api/db/schema
 * Returns table info from information_schema for the Schema Viewer.
 */
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { dbUrl } = await request.json();

    logger.info({ requestId, path: "/api/db/schema" }, "DB schema request received");

    if (!dbUrl || typeof dbUrl !== "string") {
      logger.warn({ requestId }, "Missing dbUrl in schema request");
      return NextResponse.json({ error: "dbUrl is required" }, { status: 400 });
    }

    const { sql: sqlClient } = createDbClient(dbUrl);

    const tables = await sqlClient`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    const columns = await sqlClient`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `;

    const grouped: Record<
      string,
      Array<{
        column: string;
        type: string;
        nullable: boolean;
        default: string | null;
      }>
    > = {};

    for (const row of tables) {
      grouped[row.table_name] = [];
    }

    for (const col of columns) {
      if (!grouped[col.table_name]) grouped[col.table_name] = [];
      grouped[col.table_name].push({
        column: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === "YES",
        default: col.column_default,
      });
    }

    logger.info({ requestId, tableCount: tables.length }, "DB schema fetched successfully");
    return NextResponse.json({ tables: grouped });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch schema";
    logger.error({ requestId, error: errorMessage }, "DB schema request failed");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
