import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  deleteCollection,
  deleteRequest,
  listCollections,
  upsertCollection,
  upsertRequest,
} from "@/lib/db/collections-repository";
import { createDbClient } from "@/lib/db/runtime";
import { pipelines } from "@/lib/db/schema";

/**
 * POST /api/db/collections
 * CRUD operations for collections, requests, and pipelines.
 * Actions: list, save-collection, save-request, save-pipeline, delete, load-pipelines
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dbUrl, action, ...payload } = body;

    if (!dbUrl || typeof dbUrl !== "string") {
      return NextResponse.json({ error: "dbUrl is required" }, { status: 400 });
    }

    const { db } = createDbClient(dbUrl);

    switch (action) {
      case "list-collections": {
        return NextResponse.json({ collections: await listCollections(createDbClient(dbUrl)) });
      }

      case "save-collection": {
        const { id, name, description } = payload;
        await upsertCollection(createDbClient(dbUrl), { id, name, description });
        return NextResponse.json({ ok: true });
      }

      case "save-request": {
        const { id, name, collectionId, request: requestPayload } = payload;
        await upsertRequest(createDbClient(dbUrl), {
          id,
          name,
          collectionId,
          request: requestPayload,
        });
        return NextResponse.json({ ok: true });
      }

      case "delete-request": {
        const { id } = payload;
        await deleteRequest(createDbClient(dbUrl), id);
        return NextResponse.json({ ok: true });
      }

      case "delete-collection": {
        const { id } = payload;
        await deleteCollection(createDbClient(dbUrl), id);
        return NextResponse.json({ ok: true });
      }

      case "save-pipeline": {
        const { id, name, data } = payload;
        await db
          .insert(pipelines)
          .values({ id, name, data, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: pipelines.id,
            set: { name, data, updatedAt: new Date() },
          });
        return NextResponse.json({ ok: true });
      }

      case "load-pipelines": {
        const result = await db.select().from(pipelines);
        return NextResponse.json({ pipelines: result });
      }

      case "delete-pipeline": {
        const { id } = payload;
        await db.delete(pipelines).where(eq(pipelines.id, id));
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Operation failed" },
      { status: 500 },
    );
  }
}
