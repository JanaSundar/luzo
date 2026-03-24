import { executeApiRequest } from "@/lib/http/client";
import type { ApiRequest } from "@/types";
import { logger } from "@/lib/utils/logger";

interface BatchPayload {
  envVariables?: Record<string, string>;
  requests?: ApiRequest[];
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  let payload: BatchPayload;

  try {
    payload = (await req.json()) as BatchPayload;
    logger.info(
      { requestId, requestCount: payload.requests?.length, path: "/api/execute/request/batch" },
      "Batch execute request received",
    );
  } catch {
    logger.warn({ requestId }, "Invalid JSON in batch execute request");
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload.requests?.length) {
    logger.warn({ requestId }, "Missing requests in batch execute request");
    return Response.json({ error: "Missing requests payload" }, { status: 400 });
  }

  try {
    const startTime = Date.now();
    const results = await Promise.all(
      payload.requests.map((request) =>
        executeApiRequest(request, payload.envVariables ?? {}, {
          preRequestScript: request.preRequestScript,
          testScript: request.testScript,
        }),
      ),
    );
    const durationMs = Date.now() - startTime;
    logger.info(
      { requestId, durationMs, requestCount: results.length },
      "Batch execute request successful",
    );
    return Response.json({ results });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Batch request failed";
    logger.error({ requestId, error: errorMessage }, "Batch execute request failed");
    return Response.json({ error: errorMessage }, { status: 400 });
  }
}
