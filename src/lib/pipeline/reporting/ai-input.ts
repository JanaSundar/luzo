import type { NarrativeTone } from "@/types";
import type { ReducedContext } from "@/types/pipeline-debug";
import { maskSensitiveValue } from "../sensitivity";

const SENSITIVE_KEY_PATTERN =
  /(password|token|authorization|api[_-]?key|secret|credential|bearer|access[_-]?key)/i;

export function buildToneFilteredAiInput(context: ReducedContext, tone: NarrativeTone) {
  if (tone === "executive") {
    return {
      tone,
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
        headers: Object.keys(step.headers),
        requestHeaders: Object.keys(step.requestHeaders),
        error: step.error,
      })),
    };
  }

  return {
    tone,
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
      statusCode: step.statusCode,
      latencyMs: step.latencyMs,
      error: step.error,
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
