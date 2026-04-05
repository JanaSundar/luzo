import type { executeRequest } from "@/app/actions/api-tests";
import type { PipelineStep } from "@/types";
import type { ScriptResult, StepStatus } from "@/types/pipeline-debug";

type ExecutionResponse = Awaited<ReturnType<typeof executeRequest>>;

export function toRuntimeValue(response: ExecutionResponse, step?: Pick<PipelineStep, "stepType">) {
  const parsedBody = parseResponseBody(response.body);
  const outputText = step?.stepType === "ai" ? extractAiOutputText(parsedBody) : undefined;

  return {
    response: {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: parsedBody,
      ...(outputText ? { outputText } : {}),
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

function extractAiOutputText(body: unknown) {
  if (!body || typeof body !== "object") return undefined;

  const record = body as Record<string, unknown>;
  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text;
  }

  const choices = Array.isArray(record.choices) ? record.choices : [];
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") return undefined;

  const message = (firstChoice as Record<string, unknown>).message;
  if (!message || typeof message !== "object") return undefined;

  const content = (message as Record<string, unknown>).content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return undefined;

  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const text = (part as Record<string, unknown>).text;
      return typeof text === "string" ? text : "";
    })
    .join("")
    .trim();
}
