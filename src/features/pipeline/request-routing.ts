import type { PipelineStep } from "@/types";
import type { FlowDocument } from "@/types/workflow";

export interface RequestRouteTargets {
  failure: string | null;
  success: string | null;
}

export interface RequestRouteOption {
  detail: string;
  label: string;
  method: PipelineStep["method"];
  stepId: string;
  stepIndex: number;
  subtitle: string;
}

export interface RequestRouteDisplay {
  detail: string;
  label: string;
  method: PipelineStep["method"] | null;
  subtitle: string;
}

export function getRequestRouteTargets(flowDocument: FlowDocument | undefined, stepId: string) {
  if (!flowDocument) return { failure: null, success: null };
  return flowDocument.edges.reduce<RequestRouteTargets>(
    (targets, edge) => {
      if (edge.source !== stepId) return targets;
      if (edge.semantics === "success") targets.success = edge.target;
      if (edge.semantics === "failure") targets.failure = edge.target;
      return targets;
    },
    { failure: null, success: null },
  );
}

export function updateRequestRouteTargets(
  flowDocument: FlowDocument,
  stepId: string,
  targets: RequestRouteTargets,
): FlowDocument {
  const edges = flowDocument.edges.filter(
    (edge) =>
      edge.source !== stepId || (edge.semantics !== "success" && edge.semantics !== "failure"),
  );

  if (targets.success) {
    edges.push(createRouteEdge(stepId, targets.success, "success"));
  }
  if (targets.failure) {
    edges.push(createRouteEdge(stepId, targets.failure, "failure"));
  }

  return {
    ...flowDocument,
    edges,
    updatedAt: new Date().toISOString(),
  };
}

export function buildRequestRouteOptions(
  steps: PipelineStep[],
  currentStepId: string,
): RequestRouteOption[] {
  return steps.flatMap((step, index) =>
    step.id === currentStepId
      ? []
      : [
          {
            detail: `Request ${index + 1}`,
            label: step.name?.trim() || `Request ${index + 1}`,
            method: step.method,
            stepId: step.id,
            stepIndex: index,
            subtitle: step.url?.trim() || "No URL configured",
          },
        ],
  );
}

export function resolveRequestRouteDisplay(
  targetId: string | null,
  options: RequestRouteOption[],
  fallbackLabel: string,
  fallbackSubtitle: string,
): RequestRouteDisplay {
  if (!targetId) {
    return {
      detail: fallbackLabel,
      label: fallbackLabel,
      method: null,
      subtitle: fallbackSubtitle,
    };
  }

  const option = options.find((entry) => entry.stepId === targetId);
  if (!option) {
    return {
      detail: "Unavailable",
      label: "Unavailable target",
      method: null,
      subtitle: "The selected request no longer exists",
    };
  }

  return option;
}

function createRouteEdge(source: string, target: string, semantics: "success" | "failure") {
  return {
    id: `${source}:${semantics}:${target}`,
    source,
    target,
    semantics,
  };
}
