"use client";

import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useVariableSuggestions } from "@/features/pipeline/autocomplete";
import {
  buildRequestRouteOptions,
  getRequestRouteTargets,
  resolveRequestRouteDisplay,
  updateRequestRouteTargets,
} from "@/features/pipeline/request-routing";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/utils/ui/segmentedTabs";
import { useEnvironmentStore } from "@/stores/useEnvironmentStore";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { useTimelineStore } from "@/stores/useTimelineStore";
import { cn } from "@/utils";
import { PipelineInspectorEditorSections } from "./PipelineInspectorEditorSections";
import {
  PipelineInspectorMockSection,
  PipelineInspectorRoutingSection,
} from "./PipelineInspectorUtilitySections";
import {
  type PipelineInspectorSection,
  type PipelineInspectorSectionItem,
} from "./PipelineInspectorSectionNav";

interface PipelineSideInspectorProps {
  pipelineId: string;
  stepId: string;
  onClose: () => void;
  className?: string;
}

export function PipelineSideInspector({
  pipelineId,
  stepId,
  onClose,
  className,
}: PipelineSideInspectorProps) {
  const { pipelines, replaceFlowDocument, updateStep } = usePipelineStore();
  const pipeline = useMemo(
    () => pipelines.find((p) => p.id === pipelineId),
    [pipelines, pipelineId],
  );
  const step = useMemo(() => pipeline?.steps.find((s) => s.id === stepId), [pipeline, stepId]);

  const activeEnvironment = useEnvironmentStore((s) =>
    s.environments.find((e) => e.id === s.activeEnvironmentId),
  );

  const envVars = useMemo(() => {
    if (!activeEnvironment) return {};
    return Object.fromEntries(
      activeEnvironment.variables.filter((v) => v.enabled).map((v) => [v.key, v.value]),
    );
  }, [activeEnvironment]);

  const runtimeVariables = usePipelineExecutionStore((s) => s.runtimeVariables);
  const syncGeneration = useTimelineStore((s) => s.syncGeneration);

  const suggestions = useVariableSuggestions(
    pipeline ?? undefined,
    stepId,
    envVars,
    runtimeVariables as Record<string, unknown>,
  );

  const [activeSection, setActiveSection] = useState<PipelineInspectorSection>("request");
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

  if (!step) return null;

  const isBodyDisabled = step.method === "GET" || step.method === "HEAD";
  const routingConfigured = routeTargets.success != null || routeTargets.failure != null;
  const sectionItems: PipelineInspectorSectionItem[] = [
    { id: "request", label: "Request", detail: "" },
    { id: "flow", label: "Flow", detail: "" },
    { id: "routing", label: "Routing", detail: "", highlighted: routingConfigured },
    { id: "mock", label: "Mock", detail: "", highlighted: Boolean(step.mockConfig?.enabled) },
  ];
  const successDisplay = resolveRequestRouteDisplay(
    routeTargets.success,
    routeOptions,
    "Default flow",
    "Continue with the pipeline's normal dependency order.",
  );
  const failureDisplay = resolveRequestRouteDisplay(
    routeTargets.failure,
    routeOptions,
    "Default failure",
    "The pipeline stops if this request fails.",
  );

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-l border-border/20 bg-slate-50/90 shadow-[-20px_0_50px_rgba(0,0,0,0.05)] backdrop-blur-3xl transition-all duration-300 ease-in-out dark:bg-[#090C14]/80",
        className,
      )}
    >
      <div className="flex h-[80px] shrink-0 items-center justify-between border-b border-border/40 px-10">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">
            Request Inspector
          </span>
          <div className="flex items-center gap-2">
            <h3 className="max-w-[320px] truncate text-lg font-bold tracking-tight text-foreground">
              {step.name || "Untitled Request"}
            </h3>
            {routingConfigured ? (
              <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                Routed
              </span>
            ) : null}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-muted/20 transition-all hover:bg-muted/50 hover:rotate-90"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <div
            role="tablist"
            aria-label="Request inspector sections"
            className={cn(
              segmentedTabListClassName,
              "inline-flex w-full max-w-max shrink-0 items-center gap-1 overflow-hidden",
            )}
          >
            {sectionItems.map((item) => {
              const active = item.id === activeSection;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveSection(item.id)}
                  className={segmentedTabTriggerClassName(
                    active,
                    "h-8 shrink-0 justify-center px-3 text-[11px] whitespace-nowrap",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="min-w-0 flex-1">
            {activeSection === "request" || activeSection === "flow" ? (
              <PipelineInspectorEditorSections
                section={activeSection}
                step={step}
                suggestions={suggestions}
                isBodyDisabled={isBodyDisabled}
                onChange={(updates) => updateStep(pipelineId, stepId, updates)}
              />
            ) : null}

            {activeSection === "routing" && pipeline?.flowDocument ? (
              <PipelineInspectorRoutingSection
                runtimeRoute={runtimeRoute}
                runtimeSkipped={runtimeSkipped}
                routeOptions={routeOptions}
                successDisplay={successDisplay}
                successTarget={routeTargets.success}
                failureDisplay={failureDisplay}
                failureTarget={routeTargets.failure}
                onReset={() =>
                  replaceFlowDocument(
                    pipelineId,
                    updateRequestRouteTargets(pipeline.flowDocument!, stepId, {
                      success: null,
                      failure: null,
                    }),
                  )
                }
                onSuccessChange={(success) =>
                  replaceFlowDocument(
                    pipelineId,
                    updateRequestRouteTargets(pipeline.flowDocument!, stepId, {
                      success,
                      failure: routeTargets.failure,
                    }),
                  )
                }
                onFailureChange={(failure) =>
                  replaceFlowDocument(
                    pipelineId,
                    updateRequestRouteTargets(pipeline.flowDocument!, stepId, {
                      success: routeTargets.success,
                      failure,
                    }),
                  )
                }
              />
            ) : null}

            {activeSection === "mock" ? (
              <PipelineInspectorMockSection
                config={
                  step.mockConfig ?? {
                    enabled: false,
                    statusCode: 200,
                    body: "",
                    latencyMs: 0,
                  }
                }
                suggestions={suggestions}
                onChange={(mockConfig) => updateStep(pipelineId, stepId, { mockConfig })}
              />
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
