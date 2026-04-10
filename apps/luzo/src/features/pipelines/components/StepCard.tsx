"use client";

import { motion, useDragControls } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SaveToCollectionDialog } from "@/components/collections/SaveToCollectionDialog";
import { ImportCurlDialog } from "@/components/playground/request/ImportCurlDialog";
import { RequestUrlBar } from "@/components/shared/RequestUrlBar";
import { useVariableSuggestions } from "@/features/pipeline/autocomplete";
import {
  buildRequestRouteOptions,
  getRequestRouteTargets,
  resolveRequestRouteDisplay,
} from "@/features/pipeline/request-routing";
import { useEnvironmentStore } from "@/stores/useEnvironmentStore";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { useTimelineStore } from "@/stores/useTimelineStore";
import { cn } from "@/utils";
import type { PipelineStep } from "@/types";
import type { RiskSummary } from "@/types/worker-results";
import { StepCardHeader } from "./StepCardHeader";
import { StepCardMenu } from "./StepCardMenu";
import { StepCardRouteChip } from "./StepCardRouteChip";

/** Re-export for legacy imports (`import { Badge } from "./StepCard"`). */
export { PipelineBadge as Badge } from "./PipelineBadge";

interface StepCardProps {
  executionHint?: {
    detail: string;
    mode: "parallel" | "review" | "sequential";
  };
  lineageSummary?: RiskSummary;
  step: PipelineStep;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<PipelineStep>) => void;
  onRunFromHere: () => void;
  onRunFromHereFresh: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  reorderable?: boolean;
}

export function StepCard({
  executionHint,
  lineageSummary,
  step,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onRunFromHere,
  onRunFromHereFresh,
  onDuplicate,
  onDelete,
  reorderable = true,
}: StepCardProps) {
  const dragControls = useDragControls();
  const pipeline = usePipelineStore((state) =>
    state.activePipelineId ? state.pipelines.find((p) => p.id === state.activePipelineId) : null,
  );

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

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingId]);

  const suggestions = useVariableSuggestions(
    pipeline ?? undefined,
    step.id,
    envVars,
    runtimeVariables as Record<string, unknown>,
  );
  const routeTargets = getRequestRouteTargets(pipeline?.flowDocument, step.id);
  const routeOptions = buildRequestRouteOptions(pipeline?.steps ?? [], step.id);
  const hasRouting = routeTargets.success != null || routeTargets.failure != null;
  const successDisplay = resolveRequestRouteDisplay(
    routeTargets.success,
    routeOptions,
    "Default flow",
    "Continue in order",
  );
  const failureDisplay = resolveRequestRouteDisplay(
    routeTargets.failure,
    routeOptions,
    "Stop",
    "Stop on failure",
  );
  const runtimeBadge = useMemo(() => {
    const state = useTimelineStore.getState();
    const events = Array.from(state.eventById.values());
    const stepEvent = events.find(
      (event) => event.stepId === step.id && event.eventKind === "request",
    );
    if (stepEvent?.status === "failed") return { label: "Failed", tone: "failed" as const };
    if (stepEvent?.status === "completed") return { label: "Executed", tone: "success" as const };
    const skippedEvent = events.find(
      (event) =>
        event.eventKind === "step_skipped" && (event.targetStepId ?? event.stepId) === step.id,
    );
    if (skippedEvent) return { label: "Skipped", tone: "skipped" as const };
    return null;
  }, [step.id, syncGeneration]);

  const handleRenameStart = () => {
    setRenamingId(step.id);
    setRenameValue(step.name || `Request ${index + 1}`);
  };

  const handleRenameSave = () => {
    if (renameValue.trim()) {
      onUpdate({ name: renameValue.trim() });
    }
    setRenamingId(null);
  };

  const cardContent = (
    <div
      onClick={(e) => {
        if (
          (e.target as HTMLElement).closest(
            "button, input, a, [role='dialog'], [role='menu'], [role='option'], [role='listbox'], [cmdk-list]",
          )
        )
          return;
        onSelect();
      }}
      className={cn(
        "relative isolate flex w-full flex-col overflow-hidden border bg-background text-left shadow-sm transition-all rounded-[22px] cursor-pointer",
        isSelected ? "z-10 border-border/80 shadow-xl" : "hover:border-border/40 hover:shadow-md",
      )}
    >
      <div>
        <StepCardHeader
          executionHint={executionHint}
          index={index}
          name={step.name || `Request ${index + 1}`}
          isSelected={isSelected}
          renamingId={renamingId}
          stepId={step.id}
          renameValue={renameValue}
          renameInputRef={renameInputRef}
          dragControls={dragControls}
          onRenameStart={handleRenameStart}
          onRenameSave={handleRenameSave}
          onRenameCancel={() => setRenamingId(null)}
          onRenameValueChange={setRenameValue}
          isMockEnabled={step.mockConfig?.enabled}
          runtimeBadge={runtimeBadge}
          lineageSummary={lineageSummary}
          method={step.method}
          reorderable={reorderable}
        />
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
        <div className="min-w-0 w-full flex-1 sm:w-auto">
          <RequestUrlBar
            method={step.method}
            url={step.url || ""}
            suggestions={suggestions}
            onMethodChange={(method) => onUpdate({ method })}
            onUrlChange={(url) => onUpdate({ url })}
            className="bg-transparent"
          />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ImportCurlDialog onImport={(request) => onUpdate(request)} />
          <SaveToCollectionDialog
            request={step}
            defaultName={step.name || `${step.method} ${step.url || `Request ${index + 1}`}`}
          />
          <StepCardMenu
            onRunFromHere={onRunFromHere}
            onRunFromHereFresh={onRunFromHereFresh}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        </div>
      </div>
      {hasRouting ? (
        <div className="flex flex-wrap gap-2 border-t border-border/30 px-4 pb-4 pt-1">
          <StepCardRouteChip label="Success" tone="success" value={successDisplay.label} />
          <StepCardRouteChip label="Failure" tone="failure" value={failureDisplay.label} />
        </div>
      ) : null}
    </div>
  );

  return (
    <motion.div
      layout="position"
      transition={{ layout: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }}
      className={cn("relative w-full min-w-0 max-w-full", isSelected ? "z-10" : "z-0")}
    >
      {cardContent}
    </motion.div>
  );
}
