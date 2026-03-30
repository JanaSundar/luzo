"use client";

import { PipelineRoutingPanel } from "@/components/pipelines/PipelineRoutingPanel";
import { RequestMockPanel } from "@/features/request-editor/components/RequestMockPanel";
import type { RequestRouteDisplay, RequestRouteOption } from "@/features/pipeline/request-routing";
import type { MockConfig } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import type { TimelineEvent } from "@/types/timeline-event";

interface PipelineInspectorRoutingSectionProps {
  runtimeRoute: TimelineEvent | null;
  runtimeSkipped: TimelineEvent | null;
  routeOptions: RequestRouteOption[];
  successDisplay: RequestRouteDisplay;
  successTarget: string | null;
  failureDisplay: RequestRouteDisplay;
  failureTarget: string | null;
  onReset: () => void;
  onSuccessChange: (value: string | null) => void;
  onFailureChange: (value: string | null) => void;
}

interface PipelineInspectorMockSectionProps {
  config: MockConfig;
  suggestions: VariableSuggestion[];
  onChange: (mockConfig: MockConfig) => void;
}

export function PipelineInspectorRoutingSection({
  runtimeRoute,
  runtimeSkipped,
  routeOptions,
  successDisplay,
  successTarget,
  failureDisplay,
  failureTarget,
  onReset,
  onSuccessChange,
  onFailureChange,
}: PipelineInspectorRoutingSectionProps) {
  return (
    <div className="space-y-4">
      {(runtimeRoute || runtimeSkipped) && (
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Runtime Routing
          </p>
          {runtimeRoute?.routeSemantics ? (
            <p className="mt-2 text-sm text-foreground">
              Chosen route:{" "}
              <span className="font-semibold uppercase">{runtimeRoute.routeSemantics}</span>
            </p>
          ) : null}
          {runtimeSkipped?.targetStepId ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Skipped target: {runtimeSkipped.targetStepId} ({runtimeSkipped.skippedReason})
            </p>
          ) : null}
        </div>
      )}

      <div className="rounded-2xl border border-border/40 bg-background/70 p-5 shadow-sm">
        <PipelineRoutingPanel
          options={routeOptions}
          successDisplay={successDisplay}
          successTarget={successTarget}
          failureDisplay={failureDisplay}
          failureTarget={failureTarget}
          onReset={onReset}
          onSuccessChange={onSuccessChange}
          onFailureChange={onFailureChange}
        />
      </div>
    </div>
  );
}

export function PipelineInspectorMockSection({
  config,
  suggestions,
  onChange,
}: PipelineInspectorMockSectionProps) {
  return (
    <div className="h-[500px] overflow-hidden rounded-2xl border border-border/40 bg-background/70 p-5 shadow-sm">
      <RequestMockPanel config={config} suggestions={suggestions} onChange={onChange} />
    </div>
  );
}
