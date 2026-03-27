import { NextResponse } from "next/server";
import {
  deleteCollection,
  deleteRequest,
  insertRequestsBulk,
  listCollections,
  upsertCollection,
  upsertRequest,
} from "@/services/db/collections-repository";
import { createDbClient, initSchema } from "@/services/db/runtime";
import type { Collection } from "@/types";
import { logger } from "@/utils/logger";

/**
 * POST /api/db/collections
 * CRUD operations for collections and requests.
 * Pipelines now use /api/db/pipelines.
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

    const dbClient = createDbClient(dbUrl);

    let result: { collections: Collection[] } | { ok: boolean } | null = null;
    switch (action) {
      case "list-collections": {
        result = { collections: await listCollections(dbClient) };
        break;
      }

      case "save-collection": {
        const { id, name, description } = payload;
        await upsertCollection(dbClient, { id, name, description });
        result = { ok: true };
        break;
      }

      case "save-request": {
        const { id, name, collectionId, request: requestPayload, response, autoSave } = payload;
        await upsertRequest(dbClient, {
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
          dbClient,
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
        await deleteRequest(dbClient, id);
        result = { ok: true };
        break;
      }

      case "delete-collection": {
        const { id } = payload;
        await deleteCollection(dbClient, id);
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
