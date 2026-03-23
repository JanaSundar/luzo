"use client";

import { Plus, Workflow } from "lucide-react";
import { LayoutGroup, Reorder } from "motion/react";
import { useCallback, useMemo } from "react";
import { CollectionPipelineDialog } from "@/components/pipelines/collection-generator/CollectionPipelineDialog";
import { PipelineToCollectionDialog } from "@/components/pipelines/PipelineToCollectionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPipelineExecutionHints } from "@/lib/pipeline/execution-plan";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import type { PipelineStep } from "@/types";
import { StepCard } from "./StepCard";

export function PipelineBuilder({
  onClearRequestedCollection,
  onRunFromStep,
  requestedCollectionId,
}: {
  onClearRequestedCollection?: () => void;
  onRunFromStep?: (
    stepId: string,
    mode: "partial-previous" | "partial-fresh",
  ) => void | Promise<void>;
  requestedCollectionId?: string | null;
}) {
  const {
    pipelines,
    activePipelineId,
    addStep,
    reorderSteps,
    updatePipeline,
    updateStep,
    duplicateStep,
    removeStep,
    expandedStepIds,
    setExpandedStepId,
  } = usePipelineStore();
  const { dbStatus, dbSchemaReady } = useSettingsStore();
  const canUseCollections = dbStatus === "connected" && dbSchemaReady;

  const pipeline = pipelines.find((p) => p.id === activePipelineId);
  const expandedStepId = activePipelineId ? (expandedStepIds[activePipelineId] ?? null) : null;
  const executionHints = useMemo(
    () => (pipeline ? getPipelineExecutionHints(pipeline.steps) : new Map()),
    [pipeline],
  );
  const generatedStepMeta = useMemo(
    () =>
      new Map(
        pipeline?.generationMetadata?.stepMappings.map((mapping) => [mapping.stepId, mapping]) ??
          [],
      ),
    [pipeline],
  );

  const handleReorder = useCallback(
    (newSteps: PipelineStep[]) => {
      if (!activePipelineId) return;
      reorderSteps(
        activePipelineId,
        newSteps.map((s) => s.id),
      );
    },
    [activePipelineId, reorderSteps],
  );

  const handleAddRequest = () => {
    if (!pipeline) return;
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

  if (!pipeline) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Pipeline Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">{pipeline.name}</h2>
          <Input
            value={pipeline.description || ""}
            onChange={(e) => updatePipeline(pipeline.id, { description: e.target.value })}
            placeholder="Add a description for this pipeline (e.g., Chain requests to authenticate and fetch user profile data.)"
            className="h-8 border-none bg-transparent px-0 text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0"
          />
        </div>
        {pipeline.steps.length > 0 ? (
          <div className="flex shrink-0 items-center gap-2">
            {canUseCollections ? <PipelineToCollectionDialog pipeline={pipeline} /> : null}
            <CollectionPipelineDialog
              initialCollectionId={requestedCollectionId}
              onCloseRequestReset={onClearRequestedCollection}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-4">
        {pipeline.steps.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed bg-muted/5 py-20">
            <div className="p-4 rounded-full bg-muted/30">
              <Workflow className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-muted-foreground">
                Build your API pipeline
              </h3>
              <p className="text-sm text-muted-foreground/70 max-w-md">
                Import a collection or build it manually. Reference data from previous responses
                using{" "}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                  {"{{req1.response.body.token}}"}
                </code>
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <CollectionPipelineDialog
                initialCollectionId={requestedCollectionId}
                onCloseRequestReset={onClearRequestedCollection}
                trigger={
                  <Button type="button" variant="outline" className="h-10 gap-2 px-6 font-bold">
                    <Workflow className="h-4 w-4" />
                    From collection
                  </Button>
                }
              />
              <Button
                onClick={handleAddRequest}
                className="gap-2 h-10 px-6 bg-foreground text-background hover:bg-foreground/90 font-bold"
              >
                <Plus className="h-4 w-4" />
                Add First Request
              </Button>
            </div>
          </div>
        ) : (
          <>
            <LayoutGroup id="pipeline-steps">
              <Reorder.Group
                axis="y"
                values={pipeline.steps}
                onReorder={handleReorder}
                className="flex w-full flex-col gap-6"
                role="list"
                aria-label="Pipeline requests"
              >
                {pipeline.steps.map((step, index) => (
                  <div key={step.id} className="space-y-3">
                    {shouldShowStageHeader(pipeline.steps, index, generatedStepMeta) ? (
                      <div className="rounded-xl border border-border/50 bg-muted/15 px-4 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {getStageLabel(step.id, generatedStepMeta)}
                        </p>
                      </div>
                    ) : null}
                    <StepCard
                      executionHint={executionHints.get(step.id)}
                      step={step}
                      index={index}
                      isExpanded={expandedStepId === step.id}
                      onToggleExpand={() => {
                        if (!activePipelineId) return;
                        setExpandedStepId(
                          activePipelineId,
                          expandedStepId === step.id ? null : step.id,
                        );
                      }}
                      onUpdate={(updates) => updateStep(pipeline.id, step.id, updates)}
                      onRunFromHere={() => onRunFromStep?.(step.id, "partial-previous")}
                      onRunFromHereFresh={() => onRunFromStep?.(step.id, "partial-fresh")}
                      onDuplicate={() => duplicateStep(pipeline.id, step.id)}
                      onDelete={() => removeStep(pipeline.id, step.id)}
                    />
                  </div>
                ))}
              </Reorder.Group>
            </LayoutGroup>

            <div className="mt-4">
              <Button
                onClick={handleAddRequest}
                variant="outline"
                className="h-12 gap-2 border-2 border-dashed px-8 transition-colors hover:border-primary hover:bg-primary/5"
              >
                <Plus className="h-5 w-5" />
                Add Request
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function shouldShowStageHeader(
  steps: PipelineStep[],
  index: number,
  meta: Map<string, { grouping?: "parallel" | "sequential"; stageIndex?: number }>,
) {
  const current = meta.get(steps[index]?.id ?? "");
  if (!current?.stageIndex) return false;
  if (index === 0) return true;
  const previous = meta.get(steps[index - 1]?.id ?? "");
  return previous?.stageIndex !== current.stageIndex;
}

function getStageLabel(
  stepId: string,
  meta: Map<string, { grouping?: "parallel" | "sequential"; stageIndex?: number }>,
) {
  const current = meta.get(stepId);
  if (!current?.stageIndex) return "Stage";
  return current.grouping === "parallel"
    ? `Parallel Group ${current.stageIndex}`
    : `Stage ${current.stageIndex}`;
}
