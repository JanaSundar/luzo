"use client";

import { classifySensitivity } from "@/features/pipeline/sensitivity";
import { getByPath } from "@/features/pipeline/variable-resolver";
import type { StepSnapshot } from "@/types/pipeline-runtime";
import type { TimelineEvent } from "@/types/timeline-event";
import type { VariableAnalysisOutput, VariableReferenceEdge } from "@/types/worker-results";

export interface TimelineLineageRow {
  id: string;
  field: string;
  reference: string;
  runtimeValue: string;
  passedValue: string;
  isSensitive: boolean;
  status: VariableReferenceEdge["resolutionStatus"];
}

export function buildLineageRows({
  event,
  snapshot,
  analysis,
}: {
  event: TimelineEvent | null;
  snapshot: StepSnapshot | null;
  analysis: VariableAnalysisOutput | null;
}): TimelineLineageRow[] {
  if (!event || !snapshot || !analysis) return [];

  return analysis.edges
    .filter((edge) => edge.consumerStepId === event.stepId)
    .map((edge) => {
      const runtimeValue = edge.rawRef ? getByPath(snapshot.variables, edge.rawRef) : undefined;
      const passedValue = readPassedValue({ field: edge.consumerField, event });
      const runtimeDisplay = toDisplayValue(runtimeValue);
      const passedDisplay = toDisplayValue(passedValue);

      return {
        id: edge.id,
        field: edge.consumerField,
        reference: edge.rawRef,
        runtimeValue: runtimeDisplay,
        passedValue: passedDisplay,
        isSensitive: isSensitiveLineageValue({
          field: edge.consumerField,
          reference: edge.rawRef,
          runtimeValue: runtimeDisplay,
          passedValue: passedDisplay,
        }),
        status: edge.resolutionStatus,
      };
    });
}

export function toDisplayValue(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function isSensitiveLineageValue({
  field,
  reference,
  runtimeValue,
  passedValue,
}: {
  field: string;
  reference: string;
  runtimeValue: string;
  passedValue: string;
}) {
  return (
    classifySensitivity(field, runtimeValue) !== "low" ||
    classifySensitivity(reference, runtimeValue) !== "low" ||
    classifySensitivity(field, passedValue) !== "low"
  );
}

function readPassedValue({ field, event }: { field: string; event: TimelineEvent }) {
  if (field === "url") return event.inputSnapshot?.url ?? "";
  if (field === "body") return event.inputSnapshot?.body ?? "";
  if (field.startsWith("headers.")) {
    const headerKey = field.slice("headers.".length);
    return event.inputSnapshot?.headers?.[headerKey] ?? "";
  }
  if (field.startsWith("auth.")) {
    const authKey = field.split(".").pop() ?? field;
    const headers = event.inputSnapshot?.headers ?? {};
    const matchingKey = Object.keys(headers).find((key) =>
      key.toLowerCase().includes(authKey.toLowerCase()),
    );
    return matchingKey ? headers[matchingKey] : "";
  }
  if (field.startsWith("params.")) return event.inputSnapshot?.url ?? "";
  return "";
}
