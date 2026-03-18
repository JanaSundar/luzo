import type { ApiResponse } from "@/types";
import type {
  ReducedContext,
  ReducedResponse,
  ReducedSignal,
  SignalGroup,
  StepSnapshot,
} from "@/types/pipeline-debug";
import { maskSensitiveValue } from "./sensitivity";

const MAX_RESPONSE_SUMMARY_KEYS = 20;
const MAX_STRING_VALUE_LENGTH = 200;

/**
 * Reduce a full ApiResponse into a minimal ReducedResponse.
 * Never stores the full body — only a trimmed summary.
 */
export function reduceResponse(response: ApiResponse): ReducedResponse {
  let summary: Record<string, unknown> = {};

  try {
    const body = JSON.parse(response.body);
    summary = trimObject(body, MAX_RESPONSE_SUMMARY_KEYS);
  } catch {
    summary = {
      raw:
        typeof response.body === "string"
          ? response.body.slice(0, MAX_STRING_VALUE_LENGTH)
          : "(non-JSON)",
    };
  }

  const safeHeaders: Record<string, string> = {};
  const keepHeaders = ["content-type", "x-request-id", "x-ratelimit-remaining", "cache-control"];
  for (const [key, value] of Object.entries(response.headers)) {
    if (keepHeaders.includes(key.toLowerCase())) {
      safeHeaders[key] = value;
    }
  }

  return {
    status: response.status,
    statusText: response.statusText,
    latencyMs: response.time,
    sizeBytes: response.size,
    summary,
    headers: safeHeaders,
  };
}

/**
 * Build reduced context from selected signals.
 * This is what gets sent to the AI.
 */
export function buildReducedContext(
  signalGroups: SignalGroup[],
  selectedSignals: string[],
  snapshots: StepSnapshot[],
  options: { maskSensitive?: boolean } = {}
): ReducedContext {
  const selectedSet = new Set(selectedSignals);
  const signals: ReducedSignal[] = [];

  for (const group of signalGroups) {
    for (const variable of group.variables) {
      if (!selectedSet.has(variable.path)) continue;

      let displayValue: string;
      if (options.maskSensitive && variable.sensitivity === "high") {
        displayValue = maskSensitiveValue(String(variable.value ?? ""));
      } else if (typeof variable.value === "object" && variable.value !== null) {
        displayValue = JSON.stringify(variable.value).slice(0, MAX_STRING_VALUE_LENGTH);
      } else {
        displayValue = String(variable.value ?? "null");
      }

      const isFailedStep = snapshots.find((s) => s.stepId === variable.stepId)?.status === "error";
      const isSlowStep =
        (snapshots.find((s) => s.stepId === variable.stepId)?.reducedResponse?.latencyMs ?? 0) >
        1000;

      let priority: ReducedSignal["priority"] = "normal";
      if (isFailedStep) priority = "critical";
      else if (isSlowStep || variable.path.includes("error")) priority = "high";

      signals.push({
        key: variable.path,
        label: variable.label,
        value: displayValue,
        stepId: variable.stepId,
        priority,
      });
    }
  }

  signals.sort((a, b) => {
    const order = { critical: 0, high: 1, normal: 2 };
    return order[a.priority] - order[b.priority];
  });

  const latencies = snapshots.map((s) => s.reducedResponse?.latencyMs ?? 0).filter((l) => l > 0);
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const p95Index = Math.ceil(sortedLatencies.length * 0.95) - 1;

  const metadata: ReducedContext["metadata"] = {
    totalSteps: snapshots.length,
    failedSteps: snapshots.filter((s) => s.status === "error").length,
    avgLatencyMs:
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0,
    p95LatencyMs: sortedLatencies[Math.max(0, p95Index)] ?? 0,
    totalDurationMs: calculateTotalDuration(snapshots),
  };

  const contextText = signals.map((s) => `${s.label}: ${s.value}`).join("\n");
  const estimatedTokens = Math.ceil(contextText.length / 4);

  return { signals, metadata, estimatedTokens };
}

/**
 * Format reduced context as a structured text block for AI prompt injection.
 */
export function formatContextForAI(context: ReducedContext): string {
  const lines: string[] = [];

  lines.push("## Execution Summary");
  lines.push(`- Total Steps: ${context.metadata.totalSteps}`);
  lines.push(`- Failed Steps: ${context.metadata.failedSteps}`);
  lines.push(`- Avg Latency: ${context.metadata.avgLatencyMs}ms`);
  lines.push(`- P95 Latency: ${context.metadata.p95LatencyMs}ms`);
  lines.push(`- Total Duration: ${context.metadata.totalDurationMs}ms`);
  lines.push("");

  const criticalSignals = context.signals.filter((s) => s.priority === "critical");
  const highSignals = context.signals.filter((s) => s.priority === "high");
  const normalSignals = context.signals.filter((s) => s.priority === "normal");

  if (criticalSignals.length > 0) {
    lines.push("## Critical Issues");
    for (const s of criticalSignals) {
      lines.push(`- [${s.key}] ${s.label}: ${s.value}`);
    }
    lines.push("");
  }

  if (highSignals.length > 0) {
    lines.push("## Warnings");
    for (const s of highSignals) {
      lines.push(`- [${s.key}] ${s.label}: ${s.value}`);
    }
    lines.push("");
  }

  if (normalSignals.length > 0) {
    lines.push("## Data Points");
    for (const s of normalSignals) {
      lines.push(`- [${s.key}] ${s.label}: ${s.value}`);
    }
  }

  return lines.join("\n");
}

function trimObject(obj: unknown, maxKeys: number): Record<string, unknown> {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return { value: obj };
  }

  const entries = Object.entries(obj as Record<string, unknown>);
  const trimmed: Record<string, unknown> = {};
  let count = 0;

  for (const [key, value] of entries) {
    if (count >= maxKeys) break;

    if (typeof value === "string" && value.length > MAX_STRING_VALUE_LENGTH) {
      trimmed[key] = `${value.slice(0, MAX_STRING_VALUE_LENGTH)}…`;
    } else if (Array.isArray(value)) {
      trimmed[key] = `Array(${value.length})`;
    } else if (typeof value === "object" && value !== null) {
      trimmed[key] = trimObject(value, Math.max(5, maxKeys - count));
    } else {
      trimmed[key] = value;
    }
    count++;
  }

  if (entries.length > maxKeys) {
    trimmed["__truncated"] = `${entries.length - maxKeys} more fields`;
  }

  return trimmed;
}

function calculateTotalDuration(snapshots: StepSnapshot[]): number {
  const starts = snapshots
    .map((s) => (s.startedAt ? new Date(s.startedAt).getTime() : 0))
    .filter((t) => t > 0);
  const ends = snapshots
    .map((s) => (s.completedAt ? new Date(s.completedAt).getTime() : 0))
    .filter((t) => t > 0);

  if (starts.length === 0 || ends.length === 0) return 0;
  return Math.max(...ends) - Math.min(...starts);
}
