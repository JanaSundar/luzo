import { executeApiRequest } from "@/lib/http/client";
import type { ApiRequest } from "@/types";
import { logger } from "@/lib/utils/logger";

interface RequestPayload {
  envVariables?: Record<string, string>;
  request?: ApiRequest;
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  let payload: RequestPayload;

  try {
    payload = (await req.json()) as RequestPayload;
    logger.info({ requestId, path: "/api/execute/request" }, "Single execute request received");
  } catch {
    logger.warn({ requestId }, "Invalid JSON in single execute request");
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload.request) {
    logger.warn({ requestId }, "Missing request in single execute request");
    return Response.json({ error: "Missing request payload" }, { status: 400 });
  }

  try {
    const startTime = Date.now();
    const response = await executeApiRequest(payload.request, payload.envVariables ?? {}, {
      preRequestScript: payload.request.preRequestScript,
      testScript: payload.request.testScript,
    });
    const durationMs = Date.now() - startTime;
    logger.info({ requestId, durationMs }, "Single execute request successful");
    return Response.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Request failed";
    logger.error({ requestId, error: errorMessage }, "Single execute request failed");
    return Response.json({ error: errorMessage }, { status: 400 });
  }
}
