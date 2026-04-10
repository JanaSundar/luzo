import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createDbClient, initSchema } from "@/server/db/runtime";
import { pipelines } from "@/server/db/schema";
import { hydratePipelineFromDb, sanitizePipelineForDb } from "@/features/pipeline/pipeline-db";
import type { Pipeline } from "@/types";
import { logger } from "@/utils/logger";

async function getDbFromRequest(request: Request) {
  const requestId = crypto.randomUUID();
  const body = await request.json();
  const dbUrl = String(body.dbUrl ?? "").trim();

  if (!dbUrl) {
    return {
      error: NextResponse.json({ error: "dbUrl is required" }, { status: 400 }),
      requestId,
    };
  }

  const schemaResult = await initSchema(dbUrl);
  if (!schemaResult.ok) {
    return {
      error: NextResponse.json(
        { error: schemaResult.error || "Failed to initialize database schema" },
        { status: 500 },
      ),
      requestId,
    };
  }

  return {
    db: createDbClient(dbUrl).db,
    body,
    requestId,
  };
}

export async function POST(request: Request) {
  const parsed = await getDbFromRequest(request);
  if ("error" in parsed) return parsed.error;

  try {
    const { db, body, requestId } = parsed;
    const { id, name, data } = body as { data: Pipeline; id: string; name: string };
    const sanitizedData = sanitizePipelineForDb(data);

    await db
      .insert(pipelines)
      .values({ id, name, data: sanitizedData, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: pipelines.id,
        set: { name, data: sanitizedData, updatedAt: new Date() },
      });

    return NextResponse.json({ ok: true, requestId });
  } catch (error) {
    logger.error({ error }, "Failed to save pipeline");
    return NextResponse.json({ error: "Failed to save pipeline" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const parsed = await getDbFromRequest(request);
  if ("error" in parsed) return parsed.error;

  try {
    const { db } = parsed;
    const rows = await db.select().from(pipelines);
    return NextResponse.json({
      pipelines: rows.map((entry) =>
        hydratePipelineFromDb(
          entry.data as Parameters<typeof hydratePipelineFromDb>[0],
          entry.createdAt.toISOString(),
          entry.updatedAt.toISOString(),
        ),
      ),
    });
  } catch (error) {
    logger.error({ error }, "Failed to load pipelines");
    return NextResponse.json({ error: "Failed to load pipelines" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const parsed = await getDbFromRequest(request);
  if ("error" in parsed) return parsed.error;

  try {
    const { db, body } = parsed;
    await db.delete(pipelines).where(eq(pipelines.id, String(body.id)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error }, "Failed to delete pipeline");
    return NextResponse.json({ error: "Failed to delete pipeline" }, { status: 500 });
  }
}
