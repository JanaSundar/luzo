"use server";

import { executeApiRequest } from "@/lib/http/client";
import type { ApiRequest, ApiResponse } from "@/types";

export async function executeRequest(
  request: ApiRequest,
  envVariables: Record<string, string> = {}
): Promise<ApiResponse> {
  return executeApiRequest(request, envVariables, {
    preRequestScript: request.preRequestScript,
    testScript: request.testScript,
  });
}
