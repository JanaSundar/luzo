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

export function toPostRequestResult(response: ExecutionResponse): ScriptResult | undefined {
  if (!response.postRequestResult) return undefined;
  return {
    status: response.postRequestResult.error ? "error" : "success",
    logs: response.postRequestResult.logs,
    error: response.postRequestResult.error,
    durationMs: response.postRequestResult.durationMs,
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
  const parsed = tryParseJson(body);
  if (parsed === undefined) return body;

  // Some APIs return JSON as an encoded string payload (e.g. "{\"users\":[...]}").
  // Parse one additional level for object/array-like strings so path expressions work.
  if (typeof parsed === "string" && looksLikeJsonContainer(parsed)) {
    const reparsed = tryParseJson(parsed);
    if (reparsed !== undefined) return reparsed;
  }

  return parsed;
}

function tryParseJson(input: string): unknown | undefined {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return undefined;
  }
}

function looksLikeJsonContainer(input: string): boolean {
  const trimmed = input.trim();
  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  );
}
