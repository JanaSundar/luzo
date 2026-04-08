import { and, eq } from "drizzle-orm";
import getRawBody from "raw-body";
import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { Webhook } from "svix";
import { parseWebhookToken } from "@/features/pipeline/webhook-token";
import { getClientByKey } from "@/server/db/runtime";
import { webhookEvents, webhookWaits } from "@/server/db/schema";
import { logger } from "@/utils/logger";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const parsedToken = parseWebhookToken(token);
  if (!parsedToken) {
    return NextResponse.json({ error: "Invalid webhook token" }, { status: 400 });
  }

  const client = getClientByKey(parsedToken.dbKey);
  if (!client) {
    return NextResponse.json({ error: "Webhook database client is unavailable" }, { status: 503 });
  }

  try {
    const incomingHeaders = Object.fromEntries(request.headers.entries());
    const rawBody = await readRawRequestBody(request);
    const waits = await client.db
      .select()
      .from(webhookWaits)
      .where(eq(webhookWaits.endpointId, parsedToken.endpointId));
    const openWaits = waits.filter((wait) => wait.status === "waiting");
    if (openWaits.length === 0) {
      return NextResponse.json({ ok: true, matched: false, reason: "no_open_waits" });
    }

    const deliveryId = incomingHeaders["svix-id"] ?? null;

    if (deliveryId) {
      const duplicate = await client.db
        .select()
        .from(webhookEvents)
        .where(
          and(
            eq(webhookEvents.endpointId, parsedToken.endpointId),
            eq(webhookEvents.deliveryId, deliveryId),
          ),
        )
        .limit(1);
      if (duplicate[0]) {
        return NextResponse.json({ ok: true, matched: false, duplicate: true }, { status: 202 });
      }
    }

    const payload = parsePayload(rawBody);

    const matchedWaits = openWaits.filter((wait) => {
      const value = extractCorrelationValue({
        payload,
        url: request.url,
        headers: incomingHeaders,
        source: wait.correlationSource,
        field: wait.correlationField,
      });
      return value === wait.correlationKey;
    });

    if (matchedWaits.length > 1) {
      return NextResponse.json({ error: "Ambiguous webhook correlation" }, { status: 409 });
    }

    const matchedWait = matchedWaits[0] ?? null;
    const signatureStatus = verifySignature({
      rawBody,
      headers: incomingHeaders,
      secret: matchedWait?.verificationSecret ?? null,
    });

    const eventId = crypto.randomUUID();
    await client.db.insert(webhookEvents).values({
      id: eventId,
      endpointId: parsedToken.endpointId,
      deliveryId,
      correlationKey: matchedWait?.correlationKey ?? null,
      headersRedacted: redactHeaders(incomingHeaders),
      payload,
      signatureStatus,
      matchedWaitId: matchedWait?.id ?? null,
      receivedAt: new Date(),
    });

    if (!matchedWait) {
      return NextResponse.json({ ok: true, matched: false }, { status: 202 });
    }

    if (signatureStatus !== "verified") {
      return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 401 });
    }

    await client.db
      .update(webhookWaits)
      .set({
        status: "matched",
        matchedEventId: eventId,
        updatedAt: new Date(),
      })
      .where(eq(webhookWaits.id, matchedWait.id));

    return NextResponse.json({ ok: true, matched: true, waitId: matchedWait.id, eventId });
  } catch (error) {
    logger.error({ error }, "Failed to receive webhook");
    return NextResponse.json({ error: "Failed to receive webhook" }, { status: 500 });
  }
}

function parsePayload(text: string) {
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

async function readRawRequestBody(request: Request) {
  if (!request.body) return "";
  const body = Readable.fromWeb(request.body as never);
  const contentLength = request.headers.get("content-length");
  const raw = (await getRawBody(body as NodeJS.ReadableStream, {
    length: contentLength ? Number(contentLength) : undefined,
    limit: "2mb",
    encoding: true,
  })) as string;
  return raw;
}

function verifySignature({
  rawBody,
  headers,
  secret,
}: {
  rawBody: string;
  headers: Record<string, string>;
  secret: string | null;
}) {
  if (!secret) return "not_configured";
  const svixHeaders = {
    "svix-id": headers["svix-id"] ?? "",
    "svix-timestamp": headers["svix-timestamp"] ?? "",
    "svix-signature": headers["svix-signature"] ?? "",
  };
  if (!svixHeaders["svix-id"] || !svixHeaders["svix-timestamp"] || !svixHeaders["svix-signature"]) {
    return "failed";
  }
  try {
    new Webhook(secret).verify(rawBody, svixHeaders);
    return "verified";
  } catch {
    return "failed";
  }
}

function redactHeaders(headers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      /authorization|cookie|secret|signature/i.test(key) ? "[redacted]" : value,
    ]),
  );
}

function extractCorrelationValue({
  payload,
  url,
  headers,
  source,
  field,
}: {
  payload: Record<string, unknown>;
  url: string;
  headers: Record<string, string>;
  source: string;
  field: string;
}) {
  if (source === "header") return headers[field] ?? null;
  if (source === "query") return new URL(url).searchParams.get(field);
  return field.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return null;
    return (acc as Record<string, unknown>)[key];
  }, payload);
}
