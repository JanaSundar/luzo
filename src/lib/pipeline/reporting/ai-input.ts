import type { NarrativeTone } from "@/types";
import type { ReducedContext } from "@/types/pipeline-debug";
import type { ReportLength } from "@/types/pipeline-report";
import { maskSensitiveValue } from "../sensitivity";

const SENSITIVE_KEY_PATTERN =
  /(password|token|authorization|api[_-]?key|secret|credential|bearer|access[_-]?key)/i;

const IMPORTANT_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "cache-control",
  "etag",
  "x-request-id",
  "x-correlation-id",
  "x-ratelimit-remaining",
  "x-ratelimit-limit",
  "x-ratelimit-reset",
  "strict-transport-security",
  "content-security-policy",
  "www-authenticate",
  "authorization",
];

const IMPORTANT_REQUEST_HEADERS = [
  "content-type",
  "accept",
  "authorization",
  "cache-control",
  "user-agent",
  "x-api-key",
  "x-request-id",
  "x-correlation-id",
];

function filterHeaders(
  headers: Record<string, string>,
  importantList: string[],
): Record<string, string> {
  const filtered: Record<string, string> = {};
  for (const key of importantList) {
    const lowerKey = key.toLowerCase();
    const actualKey = Object.keys(headers).find((k) => k.toLowerCase() === lowerKey);
    if (actualKey) {
      filtered[actualKey] = redactValue(actualKey, headers[actualKey]);
    }
  }
  return filtered;
}

export function buildToneFilteredAiInput(
  context: ReducedContext,
  tone: NarrativeTone,
  length: ReportLength = "medium",
) {
  if (tone === "executive") {
    return {
      tone,
      length,
      metadata: context.metadata,
      signals: context.signals.map((signal) => ({
        label: signal.label,
        value: redactValue(signal.key, signal.value),
        priority: signal.priority,
      })),
      steps: context.steps.map((step) => ({
        stepName: step.stepName,
        statusCode: step.statusCode,
        latencyMs: step.latencyMs,
        error: step.error,
      })),
    };
  }

  if (tone === "compliance") {
    return {
      tone,
      length,
      metadata: context.metadata,
      signals: context.signals.map((signal) => ({
        label: signal.label,
        key: signal.key,
        value: redactValue(signal.key, signal.value),
      })),
      steps: context.steps.map((step) => ({
        stepName: step.stepName,
        method: step.method,
        url: step.url,
        statusCode: step.statusCode,
        latencyMs: step.latencyMs,
        headers: filterHeaders(step.headers, IMPORTANT_RESPONSE_HEADERS),
        requestHeaders: filterHeaders(step.requestHeaders, IMPORTANT_REQUEST_HEADERS),
        error: step.error,
      })),
    };
  }

  return {
    tone,
    length,
    metadata: context.metadata,
    signals: context.signals.map((signal) => ({
      label: signal.label,
      key: signal.key,
      value: redactValue(signal.key, signal.value),
      priority: signal.priority,
    })),
    steps: context.steps.map((step) => ({
      stepId: step.stepId,
      stepName: step.stepName,
      method: step.method,
      url: step.url,
      status: step.status,
      statusCode: step.statusCode,
      latencyMs: step.latencyMs,
      sizeBytes: step.sizeBytes,
      error: step.error,
      headers: filterHeaders(step.headers, IMPORTANT_RESPONSE_HEADERS),
      requestHeaders: filterHeaders(step.requestHeaders, IMPORTANT_REQUEST_HEADERS),
      responseSummary: step.responseSummary,
      selectedSignals: step.selectedSignals.map((signal) => ({
        label: signal.label,
        key: signal.key,
        value: redactValue(signal.key, signal.value),
        priority: signal.priority,
      })),
    })),
  };
}

function redactValue(key: string, value: string) {
  return SENSITIVE_KEY_PATTERN.test(key) ? maskSensitiveValue(value) : value;
}
