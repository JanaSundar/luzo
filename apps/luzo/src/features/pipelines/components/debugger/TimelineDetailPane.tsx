"use client";

import { useEffect, useMemo, useState } from "react";
import { METHOD_COLORS } from "@/utils/http";
import { cn } from "@/utils";
import type { TimelineEvent } from "@/types/timeline-event";
import { formatBytes, formatDuration } from "@/features/pipeline/timeline/format-utils";
import { getStatusVisual } from "@/features/pipeline/timeline/status-config";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineLineage } from "@/features/pipelines/hooks/usePipelineLineage";
import { buildPipelineStepNameMap, resolveTimelineDisplayName } from "./timelineDisplayNames";
import { buildLineageRows } from "./timelineLineageUtils";
import {
  ErrorTab,
  LineageTab,
  OverviewTab,
  RequestTab,
  ResponseTab,
} from "./TimelineDetailTabContent";

type DetailTab = "overview" | "request" | "response" | "lineage" | "error";

export function TimelineDetailPane({ event }: { event: TimelineEvent | null }) {
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
  const tabs = getTabs({ hasError: Boolean(event.errorSnapshot) });

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
          <span className={cn("font-mono font-bold", METHOD_COLORS[event.method])}>
            {event.method}
          </span>
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
        {activeTab === "error" ? <ErrorTab event={event} /> : null}
      </div>
    </div>
  );
}

function getTabs({ hasError }: { hasError: boolean }): DetailTab[] {
  const tabs: DetailTab[] = ["overview", "request", "response", "lineage"];
  if (hasError) tabs.push("error");
  return tabs;
}
