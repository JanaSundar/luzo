import { NextResponse } from "next/server";
import { initSchema, testConnection } from "@/lib/db/runtime";
import { logger } from "@/lib/utils/logger";

/**
 * POST /api/db/connect
 * Test connection, init schema, return status.
 */
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { dbUrl } = await request.json();

    logger.info({ requestId, path: "/api/db/connect" }, "DB connect request received");

    if (!dbUrl || typeof dbUrl !== "string") {
      logger.warn({ requestId }, "Missing dbUrl in connect request");
      return NextResponse.json({ error: "dbUrl is required" }, { status: 400 });
    }

    const connectionResult = await testConnection(dbUrl);
    if (!connectionResult.ok) {
      logger.warn({ requestId, error: connectionResult.error }, "DB connection failed during test");
      return NextResponse.json(
        { connected: false, error: connectionResult.error, latencyMs: connectionResult.latencyMs },
        { status: 400 },
      );
    }

    const schemaResult = await initSchema(dbUrl);
    if (!schemaResult.ok) {
      logger.error(
        { requestId, error: schemaResult.error },
        "Failed to initialize schema during connect",
      );
      return NextResponse.json(
        { connected: true, schemaReady: false, error: schemaResult.error },
        { status: 500 },
      );
    }

    logger.info({ requestId, latencyMs: connectionResult.latencyMs }, "DB connect successful");
    return NextResponse.json({
      connected: true,
      schemaReady: schemaResult.schemaReady,
      warnings: schemaResult.warnings,
      tables: schemaResult.tables,
      latencyMs: connectionResult.latencyMs,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to connect";
    logger.error({ requestId, error: errorMessage }, "DB connect request failed");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
