"use client";

import { AlertTriangle } from "lucide-react";
import { PipelineRoutingPanel } from "@/components/pipelines/PipelineRoutingPanel";
import { PipelineBadge } from "@/components/pipelines/PipelineBadge";
import { RequestMockPanel } from "@/features/request-editor/components/RequestMockPanel";
import type { RequestRouteDisplay, RequestRouteOption } from "@/features/pipeline/request-routing";
import type { MockConfig } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import type { TimelineEvent } from "@/types/timeline-event";
import type { VariableReferenceEdge } from "@/types/worker-results";

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

interface PipelineInspectorLineageSectionProps {
  incoming: VariableReferenceEdge[];
  outgoing: VariableReferenceEdge[];
  warnings: VariableReferenceEdge[];
  stepNameById: Record<string, string>;
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
    <div className="h-full overflow-hidden rounded-2xl border border-border/40 bg-background/70 p-5 shadow-sm">
      <RequestMockPanel config={config} suggestions={suggestions} onChange={onChange} />
    </div>
  );
}

export function PipelineInspectorLineageSection({
  incoming,
  outgoing,
  warnings,
  stepNameById,
}: PipelineInspectorLineageSectionProps) {
  const incomingByField = incoming.reduce<Record<string, VariableReferenceEdge[]>>((acc, edge) => {
    acc[edge.consumerField] ??= [];
    acc[edge.consumerField].push(edge);
    return acc;
  }, {});

  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-border/40 bg-background/70 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-foreground">Lineage</h4>
        {warnings.length > 0 ? (
          <PipelineBadge className="bg-amber-500/12 text-amber-700 dark:text-amber-300">
            {warnings.length} warning{warnings.length === 1 ? "" : "s"}
          </PipelineBadge>
        ) : null}
      </div>

      <div className="mt-5 space-y-5">
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Incoming
          </p>
          {Object.keys(incomingByField).length === 0 ? (
            <p className="text-sm text-muted-foreground">No upstream variable dependencies.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(incomingByField).map(([field, edges]) => (
                <div key={field} className="space-y-1.5 border-l border-border/50 pl-3">
                  <p className="font-mono text-xs text-foreground">{field}</p>
                  {edges.map((edge) => (
                    <div key={edge.id} className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-medium text-foreground">
                        {edge.sourceAlias ?? edge.rawRef}
                      </span>
                      {edge.referencedPath ? (
                        <span className="font-mono text-muted-foreground">
                          {edge.referencedPath}
                        </span>
                      ) : null}
                      <span className={statusClassName(edge)}>
                        {edge.resolutionStatus.replaceAll("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Outgoing
          </p>
          {outgoing.length === 0 ? (
            <p className="text-sm text-muted-foreground">No downstream consumers detected.</p>
          ) : (
            <div className="space-y-2">
              {outgoing.map((edge) => (
                <div key={edge.id} className="flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {stepNameById[edge.consumerStepId] ?? "Request"}
                    </p>
                    <p className="truncate text-muted-foreground">{edge.consumerField}</p>
                  </div>
                  {edge.referencedPath ? (
                    <span className="shrink-0 font-mono text-muted-foreground">
                      {edge.referencedPath}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {warnings.length > 0 ? (
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              Warnings
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {warnings.map((edge) => (
                <p key={edge.id}>
                  <span className="font-mono text-foreground">{edge.rawRef}</span>
                  {" in "}
                  <span className="font-mono text-foreground">{edge.consumerField}</span>
                  {" is "}
                  {edge.resolutionStatus.replaceAll("_", " ")}.
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function statusClassName(edge: VariableReferenceEdge) {
  if (edge.resolutionStatus === "resolved") {
    return "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300";
  }
  if (edge.resolutionStatus === "runtime_only") {
    return "rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-700 dark:text-sky-300";
  }
  return "rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-700 dark:text-amber-300";
}
