"use client";

import { useMemo } from "react";
import {
  buildRequestRouteOptions,
  getRequestRouteTargets,
  resolveRequestRouteDisplay,
} from "@/features/pipeline/request-routing";
import { usePipelineLineage } from "@/features/pipelines/hooks/usePipelineLineage";
import { getStepLineageView } from "@/features/pipelines/lineage/selectors";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { useTimelineStore } from "@/stores/useTimelineStore";
import type { Pipeline } from "@/types";

export function usePipelineSideInspectorState({
  pipeline,
  stepId,
  syncGeneration,
}: {
  pipeline: Pipeline | undefined;
  stepId: string;
  syncGeneration: number;
}) {
  const runtimeVariables = usePipelineExecutionStore((state) => state.runtimeVariables);
  const lineageAnalysis = usePipelineLineage(
    pipeline ?? undefined,
    runtimeVariables as Record<string, unknown>,
    `inspector:${stepId}`,
  );

  const lineageView = useMemo(
    () => getStepLineageView(lineageAnalysis, stepId),
    [lineageAnalysis, stepId],
  );
  const lineageByField = useMemo(
    () =>
      lineageView.incoming.reduce<Record<string, typeof lineageView.incoming>>((acc, edge) => {
        acc[edge.consumerField] ??= [];
        acc[edge.consumerField].push(edge);
        return acc;
      }, {}),
    [lineageView.incoming],
  );
  const stepNameById = useMemo(
    () =>
      Object.fromEntries(
        (pipeline?.steps ?? []).map((entry) => [entry.id, entry.name || "Request"]),
      ),
    [pipeline?.steps],
  );
  const routeTargets = useMemo(
    () => getRequestRouteTargets(pipeline?.flowDocument, stepId),
    [pipeline?.flowDocument, stepId],
  );
  const routeOptions = useMemo(
    () => buildRequestRouteOptions(pipeline?.steps ?? [], stepId),
    [pipeline?.steps, stepId],
  );
  const runtimeRoute = useMemo(() => {
    const events = Array.from(useTimelineStore.getState().eventById.values());
    return (
      events
        .filter((event) => event.eventKind === "route_selected" && event.sourceStepId === stepId)
        .sort((a, b) => b.sequenceNumber - a.sequenceNumber)[0] ?? null
    );
  }, [stepId, syncGeneration]);
  const runtimeSkipped = useMemo(() => {
    const events = Array.from(useTimelineStore.getState().eventById.values());
    return (
      events.find((event) => event.eventKind === "step_skipped" && event.sourceStepId === stepId) ??
      null
    );
  }, [stepId, syncGeneration]);

  return {
    lineageView,
    lineageByField,
    stepNameById,
    routeTargets,
    routeOptions,
    runtimeRoute,
    runtimeSkipped,
    showLineageSection:
      lineageView.summary.incomingCount > 0 ||
      lineageView.summary.outgoingCount > 0 ||
      lineageView.warnings.length > 0,
    successDisplay: resolveRequestRouteDisplay(
      routeTargets.success,
      routeOptions,
      "Default flow",
      "Continue with the pipeline's normal dependency order.",
    ),
    failureDisplay: resolveRequestRouteDisplay(
      routeTargets.failure,
      routeOptions,
      "Default failure",
      "The pipeline stops if this request fails.",
    ),
  };
}
