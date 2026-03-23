import { executeApiRequest } from "@/lib/http/client";
import type { ApiRequest } from "@/types";

interface RequestPayload {
  envVariables?: Record<string, string>;
  request?: ApiRequest;
}

export async function POST(req: Request) {
  let payload: RequestPayload;

  try {
    payload = (await req.json()) as RequestPayload;
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload.request) {
    return Response.json({ error: "Missing request payload" }, { status: 400 });
  }

  try {
    const response = await executeApiRequest(payload.request, payload.envVariables ?? {}, {
      preRequestScript: payload.request.preRequestScript,
      testScript: payload.request.testScript,
    });
    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 },
    );
  }
}
