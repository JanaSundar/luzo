import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  deleteCollection,
  deleteRequest,
  insertRequestsBulk,
  listCollections,
  upsertCollection,
  upsertRequest,
} from "@/lib/db/collections-repository";
import { createDbClient, initSchema } from "@/lib/db/runtime";
import { hydratePipelineFromDb, sanitizePipelineForDb } from "@/lib/pipeline/pipeline-db";
import { pipelines } from "@/lib/db/schema";
import { logger } from "@/lib/utils/logger";

/**
 * POST /api/db/collections
 * CRUD operations for collections, requests, and pipelines.
 * Actions: list, save-collection, save-request, save-pipeline, delete, load-pipelines
 */
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const body = await request.json();
    const { dbUrl, action, ...payload } = body;

    logger.info(
      { requestId, action, path: "/api/db/collections" },
      "DB collections request received",
    );

    if (!dbUrl || typeof dbUrl !== "string") {
      logger.warn({ requestId }, "Missing dbUrl in collections request");
      return NextResponse.json({ error: "dbUrl is required" }, { status: 400 });
    }

    const schemaResult = await initSchema(dbUrl);
    if (!schemaResult.ok) {
      logger.error({ requestId, error: schemaResult.error }, "Failed to initialize DB schema");
      return NextResponse.json(
        { error: schemaResult.error || "Failed to initialize database schema" },
        { status: 500 },
      );
    }

    const { db } = createDbClient(dbUrl);

    let result: any;
    switch (action) {
      case "list-collections": {
        result = { collections: await listCollections(createDbClient(dbUrl)) };
        break;
      }

      case "save-collection": {
        const { id, name, description } = payload;
        await upsertCollection(createDbClient(dbUrl), { id, name, description });
        result = { ok: true };
        break;
      }

      case "save-request": {
        const { id, name, collectionId, request: requestPayload, response, autoSave } = payload;
        await upsertRequest(createDbClient(dbUrl), {
          id,
          name,
          collectionId,
          request: requestPayload,
          response,
          autoSave,
        });
        result = { ok: true };
        break;
      }

      case "save-requests-bulk": {
        const { requests: requestPayloads = [] } = payload;
        await insertRequestsBulk(
          createDbClient(dbUrl),
          requestPayloads.map((entry: Record<string, unknown>) => ({
            autoSave: entry.autoSave as boolean | undefined,
            collectionId: entry.collectionId as string,
            id: entry.id as string,
            name: entry.name as string,
            request: entry.request,
            response: entry.response,
          })),
        );
        result = { ok: true };
        break;
      }

      case "delete-request": {
        const { id } = payload;
        await deleteRequest(createDbClient(dbUrl), id);
        result = { ok: true };
        break;
      }

      case "delete-collection": {
        const { id } = payload;
        await deleteCollection(createDbClient(dbUrl), id);
        result = { ok: true };
        break;
      }

      case "save-pipeline": {
        const { id, name, data } = payload;
        const sanitizedData = sanitizePipelineForDb(data);
        await db
          .insert(pipelines)
          .values({ id, name, data: sanitizedData, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: pipelines.id,
            set: { name, data: sanitizedData, updatedAt: new Date() },
          });
        result = { ok: true };
        break;
      }

      case "load-pipelines": {
        const pipelinesResult = await db.select().from(pipelines);
        result = {
          pipelines: pipelinesResult.map((entry) =>
            hydratePipelineFromDb(
              entry.data as Parameters<typeof hydratePipelineFromDb>[0],
              entry.createdAt.toISOString(),
              entry.updatedAt.toISOString(),
            ),
          ),
        };
        break;
      }

      case "delete-pipeline": {
        const { id } = payload;
        await db.delete(pipelines).where(eq(pipelines.id, id));
        result = { ok: true };
        break;
      }

      default:
        logger.warn({ requestId, action }, "Unknown action in collections request");
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    logger.info({ requestId, action }, "DB collections request processed successfully");
    return NextResponse.json(result);
  } catch (err) {
    const rootCause =
      err && typeof err === "object" && "cause" in err && err.cause instanceof Error
        ? err.cause.message
        : null;
    const errorMessage = rootCause ?? (err instanceof Error ? err.message : "Operation failed");
    logger.error({ requestId, error: errorMessage }, "DB collections request failed");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
