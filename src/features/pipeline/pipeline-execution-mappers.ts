import type { executeRequest } from "@/app/actions/api-tests";
import type { ScriptResult, StepStatus } from "@/types/pipeline-debug";

type ExecutionResponse = Awaited<ReturnType<typeof executeRequest>>;

export function toRuntimeValue(response: ExecutionResponse) {
  return {
    response: {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: parseResponseBody(response.body),
      time: response.time,
      size: response.size,
    },
  };
}

export function toStepStatus(status: number): StepStatus {
  return status >= 200 && status < 400 ? "success" : "error";
}

export function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export function toPreRequestResult(response: ExecutionResponse): ScriptResult | undefined {
  if (!response.preRequestResult) return undefined;
  return {
    status: response.preRequestResult.error ? "error" : "success",
    logs: response.preRequestResult.logs,
    error: response.preRequestResult.error,
    durationMs: response.preRequestResult.durationMs,
  };
}

export function toTestResult(response: ExecutionResponse): ScriptResult | undefined {
  if (!response.testResult) return undefined;
  return {
    status:
      response.testResult.error || response.testResult.testResults?.some((test) => !test.passed)
        ? "error"
        : "success",
    logs: response.testResult.logs,
    error: response.testResult.error,
    durationMs: response.testResult.durationMs,
    testResults: response.testResult.testResults,
  };
}

function parseResponseBody(body: string) {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}
