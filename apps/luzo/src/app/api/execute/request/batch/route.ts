import { executeApiRequest } from "@/lib/http/client";
import type { ApiRequest } from "@/types";

interface BatchPayload {
  envVariables?: Record<string, string>;
  requests?: ApiRequest[];
}

export async function POST(req: Request) {
  let payload: BatchPayload;

  try {
    payload = (await req.json()) as BatchPayload;
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload.requests?.length) {
    return Response.json({ error: "Missing requests payload" }, { status: 400 });
  }

  try {
    const results = await Promise.all(
      payload.requests.map((request) =>
        executeApiRequest(request, payload.envVariables ?? {}, {
          preRequestScript: request.preRequestScript,
          testScript: request.testScript,
        }),
      ),
    );
    return Response.json({ results });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Batch request failed" },
      { status: 400 },
    );
  }
}
