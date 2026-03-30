import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createDbClient, initSchema } from "@/server/db/runtime";
import { webhookEvents, webhookWaits } from "@/server/db/schema";
import type { WebhookWaitPolicy } from "@/types";
import { logger } from "@/utils/logger";

async function getDbFromRequest(request: Request) {
  const body = await request.json();
  const dbUrl = String(body.dbUrl ?? "").trim();

  if (!dbUrl) {
    return { error: NextResponse.json({ error: "dbUrl is required" }, { status: 400 }) };
  }

  const schemaResult = await initSchema(dbUrl);
  if (!schemaResult.ok) {
    return {
      error: NextResponse.json(
        { error: schemaResult.error || "Failed to initialize database schema" },
        { status: 500 },
      ),
    };
  }

  return { db: createDbClient(dbUrl).db, body };
}

export async function POST(request: Request) {
  const parsed = await getDbFromRequest(request);
  if ("error" in parsed) return parsed.error;

  try {
    const { db, body } = parsed;
    const policy = body.policy as WebhookWaitPolicy;
    const expiresAt = new Date(Date.now() + policy.timeoutMs);
    const waitId = crypto.randomUUID();

    await db.insert(webhookWaits).values({
      id: waitId,
      executionId: String(body.executionId),
      stepId: String(body.stepId),
      endpointId: String(body.endpointId),
      correlationKey: String(body.correlationKey),
      correlationSource: policy.correlationSource,
      correlationField: policy.correlationField,
      status: "waiting",
      expiresAt,
      matchedEventId: null,
      verificationMode: policy.signatureSecret ? "shared-secret" : "none",
      verificationSecret: policy.signatureSecret || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      wait: {
        id: waitId,
        endpointId: body.endpointId,
        endpointToken: body.endpointToken,
        endpointUrl: body.endpointUrl,
        status: "waiting",
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to create webhook wait");
    return NextResponse.json({ error: "Failed to create webhook wait" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const parsed = await getDbFromRequest(request);
  if ("error" in parsed) return parsed.error;

  try {
    const { db, body } = parsed;
    const waitId = String(body.waitId);
    const wait = await db.select().from(webhookWaits).where(eq(webhookWaits.id, waitId)).limit(1);
    const record = wait[0];
    if (!record) return NextResponse.json({ wait: null });

    if (record.status === "waiting" && record.expiresAt.getTime() <= Date.now()) {
      await db
        .update(webhookWaits)
        .set({ status: "timeout", updatedAt: new Date() })
        .where(eq(webhookWaits.id, record.id));
      record.status = "timeout";
    }

    const matchedEvent =
      record.matchedEventId != null
        ? (
            await db
              .select()
              .from(webhookEvents)
              .where(eq(webhookEvents.id, record.matchedEventId))
              .limit(1)
          )[0]
        : null;

    return NextResponse.json({
      wait: {
        id: record.id,
        endpointId: record.endpointId,
        endpointToken: body.endpointToken ?? "",
        endpointUrl: body.endpointUrl ?? "",
        status: record.status,
        matchedPayload: matchedEvent?.payload ?? null,
        matchedEventId: record.matchedEventId,
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to read webhook wait");
    return NextResponse.json({ error: "Failed to read webhook wait" }, { status: 500 });
  }
}
