import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createDbClient } from "@/lib/db/runtime";
import { collections, pipelines, requests } from "@/lib/db/schema";

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
        const cols = await db.select().from(collections);
        const reqs = await db.select().from(requests);
        return NextResponse.json({ collections: cols, requests: reqs });
      }

      case "save-collection": {
        const { id, name } = payload;
        await db
          .insert(collections)
          .values({ id, name, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: collections.id,
            set: { name, updatedAt: new Date() },
          });
        return NextResponse.json({ ok: true });
      }

      case "save-request": {
        const { id, name, collectionId, data } = payload;
        await db
          .insert(requests)
          .values({ id, name, collectionId, data, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: requests.id,
            set: { name, collectionId, data, updatedAt: new Date() },
          });
        return NextResponse.json({ ok: true });
      }

      case "delete-request": {
        const { id } = payload;
        await db.delete(requests).where(eq(requests.id, id));
        return NextResponse.json({ ok: true });
      }

      case "delete-collection": {
        const { id } = payload;
        await db.delete(collections).where(eq(collections.id, id));
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
      { status: 500 }
    );
  }
}
