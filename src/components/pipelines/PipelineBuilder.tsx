"use client";

import {
  AnimatePresence,
  Reorder,
  motion,
  useAnimationFrame,
  useMotionValue,
  useSpring,
} from "motion/react";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import useMeasure from "react-use-measure";
import { CollectionPipelineDialog } from "@/components/pipelines/collection-generator/CollectionPipelineDialog";
import { StepCard } from "@/components/pipelines/StepCard";
import { PipelineSideInspector } from "@/components/pipelines/PipelineSideInspector";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import { usePipelineStore } from "@/stores/usePipelineStore";
import type { PipelineStep } from "@/types";
import { buildStepAliases } from "@/features/pipeline/dag-validator";
import { collectStepDependencies } from "@/features/pipeline/template-dependencies";

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
    duplicateStep,
    removeStep,
    reorderSteps,
    updateStep,
    selectedNodeIds,
    setSelectedNodeId,
  } = usePipelineStore();

  const pipeline = pipelines.find((entry) => entry.id === activePipelineId) ?? null;
  const selectedNodeId = activePipelineId ? selectedNodeIds[activePipelineId] : null;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [measureRef] = useMeasure();
  const lastStepsCount = useRef(pipeline?.steps.length ?? 0);

  // Use motion values for ultra-smooth scroll position updates
  const scrollY = useMotionValue(0);
  const smoothScrollY = useSpring(scrollY, {
    stiffness: 70,
    damping: 20,
    restDelta: 0.5,
  });

  // Sync the smooth motion value back to the container's scroll position
  useAnimationFrame(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = smoothScrollY.get();
    }
  });

  // Function to smooth scroll to a specific target or element
  const smoothScrollTo = useCallback(
    (target: number | HTMLElement) => {
      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;
      const startScroll = container.scrollTop;
      let endScroll = 0;

      if (typeof target === "number") {
        endScroll = target;
      } else {
        const rect = target.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        endScroll = startScroll + (rect.top - containerRect.top) - containerRect.height / 3;
      }

      // Clamp scroll range to avoiding overshooting
      endScroll = Math.max(0, Math.min(endScroll, container.scrollHeight - container.clientHeight));

      // Jump the motion value to the current position first to avoid jumps from previous animations
      scrollY.set(startScroll);
      // Then set the target for the spring to animate towards
      scrollY.set(endScroll);
    },
    [scrollY],
  );

  useEffect(() => {
    if (!pipeline) return;
    if (pipeline.steps.length > lastStepsCount.current) {
      // New step added, scroll to bottom
      setTimeout(() => {
        if (scrollContainerRef.current) {
          smoothScrollTo(scrollContainerRef.current.scrollHeight);
        }
      }, 150);
    }
    lastStepsCount.current = pipeline.steps.length;
  }, [pipeline?.steps.length, smoothScrollTo]);

  const handleSelect = useCallback(
    (stepId: string) => {
      if (activePipelineId) {
        setSelectedNodeId(activePipelineId, stepId);
      }
    },
    [activePipelineId, setSelectedNodeId],
  );

  if (!pipeline || !activePipelineId) return null;

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
    reorderSteps(
      pipeline.id,
      nextSteps.map((s) => s.id),
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
      <motion.div layout className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-[80px] shrink-0 items-center justify-between border-b border-border/40 bg-background/50 px-8 backdrop-blur-md">
          <div className="min-w-0 flex-1">
            <div className="group/pname flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Pipeline Builder
              </span>
              <h2 className="truncate text-lg font-bold tracking-tight text-foreground">
                {pipeline.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleAddRequest}
              variant="outline"
              className="h-9 gap-2 rounded-full border-border/60 bg-background px-5 text-sm font-semibold tracking-tight text-foreground shadow-sm hover:bg-muted/50"
            >
              <Plus className="h-4 w-4" />
              Add Request
            </Button>
            <CollectionPipelineDialog
              initialCollectionId={requestedCollectionId}
              onCloseRequestReset={onClearRequestedCollection}
            />
          </div>
        </div>

        {pipeline.steps.length > 0 ? (
          <div
            ref={scrollContainerRef}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-10 pb-20 no-scrollbar"
          >
            <div ref={measureRef} className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-10">
              <Reorder.Group
                axis="y"
                values={pipeline.steps}
                onReorder={handleReorder}
                className="flex flex-col gap-4"
              >
                <AnimatePresence initial={false}>
                  {pipeline.steps.map((step, index) => (
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
                        step={step}
                        index={index}
                        isSelected={selectedNodeId === step.id}
                        onSelect={() => handleSelect(step.id)}
                        onUpdate={(updates) => updateStep(pipeline.id, step.id, updates)}
                        onRunFromHere={() => onRunFromStep?.(step.id, "partial-previous")}
                        onRunFromHereFresh={() => onRunFromStep?.(step.id, "partial-fresh")}
                        onDuplicate={() => duplicateStep(pipeline.id, step.id)}
                        onDelete={() => removeStep(pipeline.id, step.id)}
                      />
                    </div>
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={handleAddRequest}
              className="group mb-14 flex w-full max-w-md flex-col items-center justify-center rounded-[32px] border border-dashed border-border/60 bg-muted/5 p-12 text-center text-muted-foreground transition-all hover:border-primary/30 hover:bg-muted/10 hover:shadow-md active:scale-[0.98]"
            >
              <div className="mb-6 rounded-full bg-background p-4 shadow-sm ring-1 ring-border/50 transition-all group-hover:scale-110 group-hover:ring-primary/20">
                <Plus className="h-6 w-6 opacity-40 transition-opacity group-hover:opacity-80 group-hover:text-primary" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground group-hover:text-primary">
                Click to add your first request
              </h3>
              <p className="mt-1 text-sm text-muted-foreground/80">
                Or import from cURL to get started.
              </p>
            </button>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {selectedNodeId && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "min(600px, 45dvw)", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 35 }}
            className="relative h-full shrink-0 overflow-hidden"
          >
            <div className="absolute inset-y-0 right-0 w-[500px] xl:w-[600px]">
              <PipelineSideInspector
                pipelineId={pipeline.id}
                stepId={selectedNodeId}
                onClose={() => setSelectedNodeId(pipeline.id, null)}
                className="h-full shadow-2xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
