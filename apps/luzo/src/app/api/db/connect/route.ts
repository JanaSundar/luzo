import { NextResponse } from "next/server";
import { initSchema, testConnection } from "@/lib/db/runtime";

/**
 * POST /api/db/connect
 * Test connection, init schema, return status.
 */
export async function POST(request: Request) {
  try {
    const { dbUrl } = await request.json();

    if (!dbUrl || typeof dbUrl !== "string") {
      return NextResponse.json({ error: "dbUrl is required" }, { status: 400 });
    }

    const connectionResult = await testConnection(dbUrl);
    if (!connectionResult.ok) {
      return NextResponse.json(
        { connected: false, error: connectionResult.error, latencyMs: connectionResult.latencyMs },
        { status: 400 },
      );
    }

    const schemaResult = await initSchema(dbUrl);
    if (!schemaResult.ok) {
      return NextResponse.json(
        { connected: true, schemaReady: false, error: schemaResult.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      connected: true,
      schemaReady: schemaResult.schemaReady,
      warnings: schemaResult.warnings,
      tables: schemaResult.tables,
      latencyMs: connectionResult.latencyMs,
    });
  } catch {
    return NextResponse.json({ error: "Failed to connect" }, { status: 500 });
  }
}
