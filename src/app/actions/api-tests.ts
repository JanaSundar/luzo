"use server";

import { executeApiRequest } from "@/services/http/client";
import type { ApiRequest, ApiResponse } from "@/types";

export async function executeRequest(
  request: ApiRequest,
  envVariables: Record<string, string> = {},
): Promise<
  ApiResponse & {
    preRequestResult?: { logs: string[]; error: string | null; durationMs: number };
    postRequestResult?: { logs: string[]; error: string | null; durationMs: number };
    testResult?: {
      logs: string[];
      error: string | null;
      durationMs: number;
      testResults: Array<{ name: string; passed: boolean; error?: string }>;
    };
  }
> {
  return executeApiRequest(request, envVariables, {
    preRequestScript: request.preRequestScript,
    postRequestScript: request.postRequestScript,
    testScript: request.testScript,
  });
}
