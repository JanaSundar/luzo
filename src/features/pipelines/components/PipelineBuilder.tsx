"use client";

import { AnimatePresence, Reorder, motion } from "motion/react";
import { useCallback, useMemo, useRef } from "react";
import useMeasure from "react-use-measure";
import { StepCard } from "@/components/pipelines/StepCard";
import { ensurePipelineFlowDocument } from "@/features/pipeline/canvas-flow";
import { SubflowCard } from "@/features/pipelines/components/SubflowCard";
import { cn } from "@/utils";
import { usePipelineStore } from "@/stores/usePipelineStore";
import type { PipelineStep } from "@/types";
import { buildStepAliases } from "@/features/pipeline/dag-validator";
import { reorderPipelineSteps } from "@/features/pipeline/rewrite-step-aliases";
import { collectStepDependencies } from "@/features/pipeline/template-dependencies";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineLineage } from "@/features/pipelines/hooks/usePipelineLineage";
import { getStepLineageView } from "@/features/pipelines/lineage/selectors";
import {
  PipelineBuilderEmptyState,
  PipelineBuilderHeader,
  PipelineBuilderInspector,
} from "./PipelineBuilderSections";
import { usePipelineBuilderScroll } from "./usePipelineBuilderScroll";

export function PipelineBuilder({
  onClearRequestedCollection,
  onRunFromStep,
  requestedCollectionId,
}: {
  onClearRequestedCollection?: () => void;
  onRunFromStep?: (
    stepId: string,
    mode: "partial-fresh" | "partial-previous",
  ) => void | Promise<void>;
  requestedCollectionId?: string | null;
}) {
  const {
    pipelines,
    activePipelineId,
    addStep,
    createSubflowFromStep,
    duplicateStep,
    removeNode,
    removeStep,
    subflowDefinitions,
    updatePipeline,
    updateStep,
    selectedNodeIds,
    setSelectedNodeId,
  } = usePipelineStore();

  const pipeline = pipelines.find((entry) => entry.id === activePipelineId) ?? null;
  const selectedNodeId = activePipelineId ? selectedNodeIds[activePipelineId] : null;
  const runtimeVariables = usePipelineExecutionStore((state) => state.runtimeVariables);
  const lineageAnalysis = usePipelineLineage(
    pipeline,
    runtimeVariables as Record<string, unknown>,
    "builder",
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [measureRef] = useMeasure();
  usePipelineBuilderScroll({ pipeline, scrollContainerRef });

  const handleSelect = useCallback(
    (stepId: string) => {
      if (activePipelineId) {
        setSelectedNodeId(activePipelineId, stepId);
      }
    },
    [activePipelineId, setSelectedNodeId],
  );

  if (!pipeline || !activePipelineId) return null;
  const flow = ensurePipelineFlowDocument(pipeline);
  const visibleNodes = flow.nodes.filter(
    (node) => node.kind === "request" || node.kind === "subflow",
  );
  const hasSubflows = visibleNodes.some((node) => node.kind === "subflow");
  const subflowDefinitionByKey = new Map(
    subflowDefinitions.map((definition) => [`${definition.id}:${definition.version}`, definition]),
  );

  const executionHints = useMemo(() => {
    if (!pipeline) return new Map<string, { mode: "parallel" | "sequential"; detail: string }>();

    const aliases = buildStepAliases(pipeline.steps);
    const hints = new Map<string, { mode: "parallel" | "sequential"; detail: string }>();

    pipeline.steps.forEach((step) => {
      const deps = collectStepDependencies(step, aliases);
      if (deps.length === 0) {
        hints.set(step.id, { mode: "parallel", detail: "Available immediately" });
      } else {
        // Find the first dependency that refers to a previous step
        const firstDep = deps[0];
        const sourceStep = pipeline.steps.find((s) => {
          const sAlias = aliases.find((a) => a.stepId === s.id);
          return sAlias?.alias === firstDep.alias;
        });

        hints.set(step.id, {
          mode: "sequential",
          detail: sourceStep
            ? `Runs after ${sourceStep.name || `Request ${pipeline.steps.indexOf(sourceStep) + 1}`}`
            : `Runs after ${firstDep.alias}`,
        });
      }
    });

    return hints;
  }, [pipeline]);

  const handleReorder = (nextSteps: PipelineStep[]) => {
    updatePipeline(
      pipeline.id,
      reorderPipelineSteps(
        pipeline,
        nextSteps.map((step) => step.id),
      ),
    );
  };

  const handleAddRequest = () => {
    addStep(pipeline.id, {
      name: `Request ${pipeline.steps.length + 1}`,
      method: "GET",
      url: "",
      headers: [],
      params: [],
      body: null,
      bodyType: "none",
      auth: { type: "none" },
    });
  };

  return (
    <div className="flex h-full min-w-0 flex-1 overflow-hidden bg-background">
      {/* Main Builder Area */}
      <motion.div
        layout
        transition={{ layout: { duration: 0.2, ease: "easeOut" } }}
        className="flex h-full min-w-0 flex-1 flex-col overflow-hidden"
      >
        <PipelineBuilderHeader
          pipelineId={pipeline.id}
          name={pipeline.name}
          requestedCollectionId={requestedCollectionId}
          onAddRequest={handleAddRequest}
          onClearRequestedCollection={onClearRequestedCollection}
        />

        {visibleNodes.length > 0 ? (
          <div
            ref={scrollContainerRef}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-10 pb-20 no-scrollbar"
          >
            <div ref={measureRef} className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-10">
              {hasSubflows ? (
                <div className="flex flex-col gap-4">
                  {visibleNodes.map((node) => {
                    if (node.kind === "subflow" && node.config?.kind === "subflow") {
                      const definition = subflowDefinitionByKey.get(
                        `${node.config.subflowId}:${node.config.subflowVersion}`,
                      );
                      return (
                        <div
                          key={node.id}
                          data-step-id={node.id}
                          className={cn(
                            "relative transition-all duration-300",
                            selectedNodeId === node.id ? "z-10" : "z-0",
                          )}
                        >
                          <SubflowCard
                            config={node.config}
                            definition={definition}
                            isSelected={selectedNodeId === node.id}
                            onSelect={() => handleSelect(node.id)}
                            onDelete={() => removeNode(pipeline.id, node.id)}
                          />
                        </div>
                      );
                    }

                    const requestRef = node.requestRef ?? node.dataRef ?? node.id;
                    const step = pipeline.steps.find((entry) => entry.id === requestRef);
                    const requestIndex = pipeline.steps.findIndex(
                      (entry) => entry.id === requestRef,
                    );
                    if (!step || requestIndex === -1) return null;
                    return (
                      <div
                        key={step.id}
                        data-step-id={step.id}
                        className={cn(
                          "relative transition-all duration-300",
                          selectedNodeId === step.id ? "z-10" : "z-0",
                        )}
                      >
                        <StepCard
                          executionHint={executionHints.get(step.id)}
                          lineageSummary={getStepLineageView(lineageAnalysis, step.id).summary}
                          step={step}
                          index={requestIndex}
                          reorderable={false}
                          isSelected={selectedNodeId === step.id}
                          onSelect={() => handleSelect(step.id)}
                          onUpdate={(updates) => updateStep(pipeline.id, step.id, updates)}
                          onRunFromHere={() => onRunFromStep?.(step.id, "partial-previous")}
                          onRunFromHereFresh={() => onRunFromStep?.(step.id, "partial-fresh")}
                          onCreateSubflow={() => createSubflowFromStep(pipeline.id, step.id)}
                          onDuplicate={() => duplicateStep(pipeline.id, step.id)}
                          onDelete={() => removeStep(pipeline.id, step.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={pipeline.steps}
                  onReorder={handleReorder}
                  className="flex flex-col gap-4"
                >
                  <AnimatePresence initial={false}>
                    {pipeline.steps.map((step, index) => (
                      <Reorder.Item
                        key={step.id}
                        value={step}
                        layout="position"
                        transition={{
                          layout: { type: "spring", stiffness: 400, damping: 40, mass: 0.8 },
                        }}
                        data-step-id={step.id}
                        className={cn(
                          "relative w-full min-w-0 max-w-full transition-all duration-300",
                          selectedNodeId === step.id ? "z-10" : "z-0",
                        )}
                      >
                        <StepCard
                          executionHint={executionHints.get(step.id)}
                          lineageSummary={getStepLineageView(lineageAnalysis, step.id).summary}
                          step={step}
                          index={index}
                          reorderable
                          isSelected={selectedNodeId === step.id}
                          onSelect={() => handleSelect(step.id)}
                          onUpdate={(updates) => updateStep(pipeline.id, step.id, updates)}
                          onRunFromHere={() => onRunFromStep?.(step.id, "partial-previous")}
                          onRunFromHereFresh={() => onRunFromStep?.(step.id, "partial-fresh")}
                          onCreateSubflow={() => createSubflowFromStep(pipeline.id, step.id)}
                          onDuplicate={() => duplicateStep(pipeline.id, step.id)}
                          onDelete={() => removeStep(pipeline.id, step.id)}
                        />
                      </Reorder.Item>
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              )}
            </div>
          </div>
        ) : (
          <PipelineBuilderEmptyState
            requestedCollectionId={requestedCollectionId}
            onAddRequest={handleAddRequest}
            onClearRequestedCollection={onClearRequestedCollection}
          />
        )}
      </motion.div>

      <AnimatePresence>
        <PipelineBuilderInspector
          pipeline={pipeline}
          selectedNodeId={selectedNodeId}
          onClose={() => setSelectedNodeId(pipeline.id, null)}
        />
      </AnimatePresence>
    </div>
  );
}
