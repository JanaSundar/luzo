import { NextResponse } from "next/server";
import { createDbClient } from "@/lib/db/runtime";

/**
 * POST /api/db/schema
 * Returns table info from information_schema for the Schema Viewer.
 */
export async function POST(request: Request) {
  try {
    const { dbUrl } = await request.json();

    if (!dbUrl || typeof dbUrl !== "string") {
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

    return NextResponse.json({ tables: grouped });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch schema" },
      { status: 500 },
    );
  }
}
