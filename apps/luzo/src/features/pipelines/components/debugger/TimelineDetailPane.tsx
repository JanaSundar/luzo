"use client";

import { useEffect, useMemo, useState } from "react";
import { METHOD_COLORS } from "@/utils/http";
import { cn } from "@/utils";
import type { PipelineRunDiff } from "@/types/pipeline-debug";
import type { TimelineEvent } from "@/types/timeline-event";
import { formatBytes, formatDuration } from "@/features/pipeline/timeline/format-utils";
import { getStatusVisual } from "@/features/pipeline/timeline/status-config";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineLineage } from "@/features/pipelines/hooks/usePipelineLineage";
import { buildPipelineStepNameMap, resolveTimelineDisplayName } from "./timelineDisplayNames";
import { buildLineageRows } from "./timelineLineageUtils";
import {
  DiffTab,
  ErrorTab,
  LineageTab,
  OverviewTab,
  RequestTab,
  ResponseTab,
} from "./TimelineDetailTabContent";

type DetailTab = "overview" | "request" | "response" | "lineage" | "diff" | "error";

export function TimelineDetailPane({
  diff,
  event,
}: {
  diff: PipelineRunDiff | null;
  event: TimelineEvent | null;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const { pipelines, activePipelineId } = usePipelineStore();
  const pipeline = useMemo(
    () => pipelines.find((entry) => entry.id === activePipelineId) ?? null,
    [pipelines, activePipelineId],
  );
  const stepNameById = useMemo(() => buildPipelineStepNameMap(pipeline), [pipeline]);
  const snapshots = usePipelineExecutionStore((state) => state.snapshots);
  const runtimeVariables = usePipelineExecutionStore((state) => state.runtimeVariables);
  const snapshot = useMemo(
    () => snapshots.find((entry) => entry.stepId === event?.stepId) ?? null,
    [snapshots, event?.stepId],
  );
  const lineageExecutionContext = (snapshot?.variables ?? runtimeVariables) as Record<
    string,
    unknown
  >;
  const lineageAnalysis = usePipelineLineage(
    pipeline,
    lineageExecutionContext,
    `timeline:${event?.eventId ?? event?.stepId ?? "none"}`,
  );
  const lineageRows = useMemo(
    () => buildLineageRows({ event, snapshot, analysis: lineageAnalysis }),
    [event, snapshot, lineageAnalysis],
  );
  const stepDiff = event?.stepId ? (diff?.stepsById[event.stepId] ?? null) : null;

  useEffect(() => {
    setActiveTab("overview");
  }, [event?.eventId]);

  if (!event) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm italic text-muted-foreground">
        Select a timeline event to view details
      </div>
    );
  }

  const visual = getStatusVisual(event.status);
  const displayStepName = resolveTimelineDisplayName({
    stepId: event.stepId,
    fallback: event.stepName,
    stepNameById,
  });
  const tabs = getTabs({
    hasDiff: Boolean(stepDiff),
    hasError: Boolean(event.errorSnapshot),
    isCondition: event.eventKind === "condition_evaluated",
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b bg-muted/5 p-4">
        <div className="mb-1 flex items-center gap-3">
          <span className={cn("text-2xl font-bold tracking-tight", visual.color)}>
            {event.httpStatus
              ? `${event.httpStatus} ${event.outputSnapshot?.statusText ?? ""}`
              : visual.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {event.eventKind !== "condition_evaluated" && (
            <span className={cn("font-mono font-bold", METHOD_COLORS[event.method])}>
              {event.method}
            </span>
          )}
          <span className="truncate">{displayStepName}</span>
          {event.durationMs != null ? <span>· {formatDuration(event.durationMs)}</span> : null}
          {event.responseSize != null ? <span>· {formatBytes(event.responseSize)}</span> : null}
        </div>
      </div>

      <div className="border-b border-border/40 bg-muted/10 px-4 py-2.5">
        <nav
          role="tablist"
          aria-label="Event details"
          className="inline-flex min-w-0 max-w-full items-center gap-1 overflow-x-auto"
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 text-xs font-medium capitalize transition-colors",
                activeTab === tab
                  ? "bg-foreground text-background"
                  : "bg-background/70 text-muted-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="custom-scrollbar flex-1 overflow-auto p-4">
        {activeTab === "overview" ? <OverviewTab event={event} /> : null}
        {activeTab === "request" ? <RequestTab event={event} /> : null}
        {activeTab === "response" ? <ResponseTab event={event} /> : null}
        {activeTab === "lineage" ? <LineageTab rows={lineageRows} /> : null}
        {activeTab === "diff" ? <DiffTab stepDiff={stepDiff} /> : null}
        {activeTab === "error" ? <ErrorTab event={event} /> : null}
      </div>
    </div>
  );
}

function getTabs({
  hasDiff,
  hasError,
  isCondition,
}: {
  hasDiff: boolean;
  hasError: boolean;
  isCondition: boolean;
}): DetailTab[] {
  const tabs: DetailTab[] = ["overview"];
  if (!isCondition) {
    tabs.push("request", "response");
  }
  tabs.push("lineage");
  if (hasDiff) tabs.push("diff");
  if (hasError) tabs.push("error");
  return tabs;
}
