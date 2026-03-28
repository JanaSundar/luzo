"use client";

import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { PipelineRoutingPanel } from "@/components/pipelines/PipelineRoutingPanel";
import { RequestForm } from "@/components/shared/RequestForm";
import type { TabId } from "@/components/shared/RequestFormTabs";
import { useVariableSuggestions } from "@/features/pipeline/autocomplete";
import {
  buildRequestRouteOptions,
  getRequestRouteTargets,
  resolveRequestRouteDisplay,
  updateRequestRouteTargets,
} from "@/features/pipeline/request-routing";
import { useEnvironmentStore } from "@/stores/useEnvironmentStore";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

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

  const suggestions = useVariableSuggestions(
    pipeline ?? undefined,
    stepId,
    envVars,
    runtimeVariables as Record<string, unknown>,
  );

  const [activeTab, setActiveTab] = useState<TabId>("params");
  const routeTargets = useMemo(
    () => getRequestRouteTargets(pipeline?.flowDocument, stepId),
    [pipeline?.flowDocument, stepId],
  );
  const routeOptions = useMemo(
    () => buildRequestRouteOptions(pipeline?.steps ?? [], stepId),
    [pipeline?.steps, stepId],
  );

  if (!step) return null;

  const disabledTabs: TabId[] = step.method === "GET" || step.method === "HEAD" ? ["body"] : [];
  const routingConfigured = routeTargets.success != null || routeTargets.failure != null;
  const successDisplay = resolveRequestRouteDisplay(
    routeTargets.success,
    routeOptions,
    "Default flow",
    "Continue with the pipeline's normal dependency order.",
  );
  const failureDisplay = resolveRequestRouteDisplay(
    routeTargets.failure,
    routeOptions,
    "Stop pipeline",
    "End this path when the request fails.",
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
        <div className="mx-auto max-w-2xl">
          <RequestForm
            {...step}
            suggestions={suggestions}
            onChange={(updates) => updateStep(pipelineId, stepId, updates)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            disabledTabs={disabledTabs}
            routingConfigured={routingConfigured}
            mockConfig={
              step.mockConfig ?? {
                enabled: false,
                statusCode: 200,
                body: "",
                latencyMs: 0,
              }
            }
            showRoutingTab
            showTabsOnly
            className="mb-4"
          />
          {activeTab === "routing" && pipeline?.flowDocument ? (
            <PipelineRoutingPanel
              options={routeOptions}
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
          ) : (
            <RequestForm
              {...step}
              suggestions={suggestions}
              onChange={(updates) => updateStep(pipelineId, stepId, updates)}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              disabledTabs={disabledTabs}
              mockConfig={
                step.mockConfig ?? {
                  enabled: false,
                  statusCode: 200,
                  body: "",
                  latencyMs: 0,
                }
              }
              showContentOnly
              className="h-[500px]"
            />
          )}
        </div>
      </div>
    </aside>
  );
}
