import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createDbClient, initSchema } from "@/services/db/runtime";
import { templates } from "@/services/db/schema";
import { hydrateTemplateFromDb, sanitizeTemplateForDb } from "@/features/templates/template-db";
import type { TemplateDefinition } from "@/types";
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
    const { db, body } = parsed;
    const template = body.data as TemplateDefinition;
    const sanitized = sanitizeTemplateForDb(template);

    await db
      .insert(templates)
      .values({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        tags: template.tags,
        complexity: template.complexity,
        sourceType: template.sourceType,
        data: sanitized,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: templates.id,
        set: {
          name: template.name,
          description: template.description,
          category: template.category,
          tags: template.tags,
          complexity: template.complexity,
          sourceType: template.sourceType,
          data: sanitized,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error }, "Failed to save template");
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const parsed = await getDbFromRequest(request);
  if ("error" in parsed) return parsed.error;

  try {
    const { db } = parsed;
    const rows = await db.select().from(templates);
    return NextResponse.json({
      templates: rows.map((entry) =>
        hydrateTemplateFromDb(
          entry.data as Parameters<typeof hydrateTemplateFromDb>[0],
          entry.createdAt.toISOString(),
          entry.updatedAt.toISOString(),
        ),
      ),
    });
  } catch (error) {
    logger.error({ error }, "Failed to load templates");
    return NextResponse.json({ error: "Failed to load templates" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const parsed = await getDbFromRequest(request);
  if ("error" in parsed) return parsed.error;

  try {
    const { db, body } = parsed;
    await db.delete(templates).where(eq(templates.id, String(body.id)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error }, "Failed to delete template");
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
