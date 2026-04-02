"use client";

import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useVariableSuggestions } from "@/features/pipeline/autocomplete";
import {
  getConditionRouteTargets,
  updateConditionRouteTargets,
  updateRequestRouteTargets,
} from "@/features/pipeline/request-routing";
import {
  createFlowEdge,
  createFlowNodeRecord,
  createDefaultNodeConfig,
} from "@/features/pipeline/canvas-flow";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/utils/ui/segmentedTabs";
import { useEnvironmentStore } from "@/stores/useEnvironmentStore";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { useTimelineStore } from "@/stores/useTimelineStore";
import { cn } from "@/utils";
import { PipelineSubflowInspector } from "./PipelineSubflowInspector";
import { PipelineInspectorEditorSections } from "./PipelineInspectorEditorSections";
import {
  PipelineInspectorLineageSection,
  PipelineInspectorMockSection,
  PipelineInspectorRoutingSection,
} from "./PipelineInspectorUtilitySections";
import {
  type PipelineInspectorSection,
  type PipelineInspectorSectionItem,
} from "./PipelineInspectorSectionNav";
import { usePipelineSideInspectorState } from "./PipelineSideInspectorState";

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
  const {
    pipelines,
    replaceFlowDocument,
    updateStep,
    updateSubflowNode,
    updateSubflowRequest,
    subflowDefinitions,
  } = usePipelineStore();
  const pipeline = useMemo(
    () => pipelines.find((p) => p.id === pipelineId),
    [pipelines, pipelineId],
  );
  const selectedNode = useMemo(
    () => pipeline?.flowDocument?.nodes.find((node) => node.id === stepId),
    [pipeline, stepId],
  );
  const step = useMemo(() => pipeline?.steps.find((s) => s.id === stepId), [pipeline, stepId]);
  const subflowDefinition = useMemo(() => {
    if (selectedNode?.config?.kind !== "subflow") return null;
    const config = selectedNode.config;
    return (
      subflowDefinitions.find(
        (definition) =>
          definition.id === config.subflowId && definition.version === config.subflowVersion,
      ) ?? null
    );
  }, [selectedNode, subflowDefinitions]);

  const activeEnvironment = useEnvironmentStore((s) =>
    s.environments.find((e) => e.id === s.activeEnvironmentId),
  );

  const envVars = useMemo(() => {
    if (!activeEnvironment) return {};
    return Object.fromEntries(
      activeEnvironment.variables.filter((v) => v.enabled).map((v) => [v.key, v.value]),
    );
  }, [activeEnvironment]);

  const syncGeneration = useTimelineStore((s) => s.syncGeneration);
  const runtimeVariables = usePipelineExecutionStore((s) => s.runtimeVariables);
  const suggestions = useVariableSuggestions(
    pipeline ?? undefined,
    stepId,
    envVars,
    runtimeVariables as Record<string, unknown>,
  );

  const [activeSection, setActiveSection] = useState<PipelineInspectorSection>("request");
  const {
    lineageView,
    lineageByField,
    stepNameById,
    routeTargets,
    routeOptions,
    runtimeRoute,
    runtimeSkipped,
    showLineageSection,
    successDisplay,
    failureDisplay,
  } = usePipelineSideInspectorState({ pipeline, stepId, syncGeneration });

  // Derive connected condition node here (above all early returns) to satisfy hooks rules.
  const connectedConditionNode = useMemo(() => {
    const doc = pipeline?.flowDocument;
    if (!doc) return null;
    const edge = doc.edges.find(
      (e) =>
        e.source === stepId && doc.nodes.some((n) => n.id === e.target && n.kind === "condition"),
    );
    if (!edge) return null;
    return doc.nodes.find((n) => n.id === edge.target) ?? null;
  }, [pipeline?.flowDocument, stepId]);
  const conditionRouteTargets = useMemo(
    () =>
      connectedConditionNode
        ? getConditionRouteTargets(pipeline?.flowDocument, connectedConditionNode.id)
        : { true: null, false: null },
    [connectedConditionNode, pipeline?.flowDocument],
  );

  if (!selectedNode) return null;
  if (selectedNode.kind === "subflow" && selectedNode.config?.kind === "subflow") {
    const subflowConfig = selectedNode.config;
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
              Subflow Inspector
            </span>
            <h3 className="max-w-[320px] truncate text-lg font-bold tracking-tight text-foreground">
              {selectedNode.config.label || subflowDefinition?.name || "Untitled Subflow"}
            </h3>
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

        <div className="flex min-h-0 flex-1 flex-col p-10">
          <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-5">
            <PipelineSubflowInspector
              config={subflowConfig}
              definition={subflowDefinition ?? undefined}
              suggestions={suggestions}
              onChange={(nextConfig) => updateSubflowNode(pipelineId, stepId, nextConfig)}
              onRequestChange={(requestId, nextRequest) =>
                updateSubflowRequest(
                  subflowConfig.subflowId,
                  subflowConfig.subflowVersion,
                  requestId,
                  nextRequest,
                )
              }
            />
          </div>
        </div>
      </aside>
    );
  }

  if (!step) return null;

  const isBodyDisabled = step.method === "GET" || step.method === "HEAD";
  const routingConfigured =
    routeTargets.success != null || routeTargets.failure != null || connectedConditionNode != null;

  const sectionItems: PipelineInspectorSectionItem[] = [
    { id: "request", label: "Request", detail: "" },
    { id: "flow", label: "Flow", detail: "" },
    { id: "routing", label: "Routing", detail: "", highlighted: routingConfigured },
    { id: "lineage", label: "Lineage", detail: "", highlighted: showLineageSection },
    { id: "mock", label: "Mock", detail: "", highlighted: Boolean(step.mockConfig?.enabled) },
  ];

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

      <div className="flex min-h-0 flex-1 flex-col p-10">
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-5">
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

          <div className="min-h-0 min-w-0 flex-1">
            {activeSection === "request" || activeSection === "flow" ? (
              <PipelineInspectorEditorSections
                section={activeSection}
                step={step}
                suggestions={suggestions}
                lineageByField={lineageByField}
                isBodyDisabled={isBodyDisabled}
                onChange={(updates) => updateStep(pipelineId, stepId, updates)}
              />
            ) : null}

            {activeSection === "lineage" ? (
              <PipelineInspectorLineageSection
                incoming={lineageView.incoming}
                outgoing={lineageView.outgoing}
                warnings={lineageView.warnings}
                stepNameById={stepNameById}
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
                connectedConditionNode={connectedConditionNode}
                suggestions={suggestions}
                onAddCondition={() => {
                  const doc = pipeline.flowDocument!;
                  const sourceNode = doc.nodes.find((n) => n.id === stepId);
                  const pos = sourceNode?.position
                    ? { x: sourceNode.position.x + 320, y: sourceNode.position.y }
                    : { x: 640, y: 200 };
                  const condNode = createFlowNodeRecord("condition", pos, {
                    config: createDefaultNodeConfig("condition"),
                  });
                  const requestToConditionEdge = createFlowEdge(stepId, condNode.id, "control");
                  const defaultTrueTarget =
                    routeTargets.success ?? routeTargets.failure ?? routeOptions[0]?.stepId ?? null;
                  const defaultFalseTarget =
                    routeTargets.failure && routeTargets.failure !== defaultTrueTarget
                      ? routeTargets.failure
                      : null;
                  const nextDoc = updateRequestRouteTargets(doc, stepId, {
                    success: null,
                    failure: null,
                  });
                  const docWithCondition = {
                    ...nextDoc,
                    nodes: [...nextDoc.nodes, condNode],
                    edges: [...nextDoc.edges, requestToConditionEdge],
                  };
                  replaceFlowDocument(
                    pipelineId,
                    updateConditionRouteTargets(docWithCondition, condNode.id, {
                      true: defaultTrueTarget,
                      false: defaultFalseTarget,
                    }),
                  );
                }}
                onConditionChange={(nextConfig) =>
                  replaceFlowDocument(pipelineId, {
                    ...pipeline.flowDocument!,
                    nodes: pipeline.flowDocument!.nodes.map((n) =>
                      n.id === connectedConditionNode?.id ? { ...n, config: nextConfig } : n,
                    ),
                  })
                }
                onRemoveCondition={() => {
                  if (!connectedConditionNode) return;
                  replaceFlowDocument(pipelineId, {
                    ...pipeline.flowDocument!,
                    nodes: pipeline.flowDocument!.nodes.filter(
                      (n) => n.id !== connectedConditionNode.id,
                    ),
                    edges: pipeline.flowDocument!.edges.filter(
                      (e) =>
                        e.source !== connectedConditionNode.id &&
                        e.target !== connectedConditionNode.id,
                    ),
                  });
                }}
                conditionTrueTarget={conditionRouteTargets.true}
                conditionFalseTarget={conditionRouteTargets.false}
                onConditionTrueChange={(trueTarget) => {
                  if (!connectedConditionNode) return;
                  replaceFlowDocument(
                    pipelineId,
                    updateConditionRouteTargets(pipeline.flowDocument!, connectedConditionNode.id, {
                      true: trueTarget,
                      false: conditionRouteTargets.false,
                    }),
                  );
                }}
                onConditionFalseChange={(falseTarget) => {
                  if (!connectedConditionNode) return;
                  replaceFlowDocument(
                    pipelineId,
                    updateConditionRouteTargets(pipeline.flowDocument!, connectedConditionNode.id, {
                      true: conditionRouteTargets.true,
                      false: falseTarget,
                    }),
                  );
                }}
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
