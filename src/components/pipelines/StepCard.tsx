"use client";

import { Reorder, motion, useDragControls } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SaveToCollectionDialog } from "@/components/collections/SaveToCollectionDialog";
import { ImportCurlDialog } from "@/components/playground/request/ImportCurlDialog";
import { RequestUrlBar } from "@/components/shared/RequestUrlBar";
import { useVariableSuggestions } from "@/features/pipeline/autocomplete";
import { useEnvironmentStore } from "@/stores/useEnvironmentStore";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { cn } from "@/utils";
import type { PipelineStep } from "@/types";
import { StepCardHeader } from "./StepCardHeader";
import { StepCardMenu } from "./StepCardMenu";

/** Re-export for legacy imports (`import { Badge } from "./StepCard"`). */
export { PipelineBadge as Badge } from "./PipelineBadge";

interface StepCardProps {
  executionHint?: {
    detail: string;
    mode: "parallel" | "review" | "sequential";
  };
  step: PipelineStep;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<PipelineStep>) => void;
  onRunFromHere: () => void;
  onRunFromHereFresh: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function StepCard({
  executionHint,
  step,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onRunFromHere,
  onRunFromHereFresh,
  onDuplicate,
  onDelete,
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

  return (
    <Reorder.Item
      value={step}
      dragControls={dragControls}
      dragListener={false}
      layout
      transition={{
        layout: { type: "spring", stiffness: 450, damping: 35 },
      }}
      className={cn("relative w-full min-w-0 max-w-full", isSelected ? "z-10" : "z-0")}
    >
      <motion.div
        layout
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
          isSelected
            ? "border-border/80 shadow-xl transform scale-[1.012] z-10"
            : "hover:border-border/40 hover:shadow-md",
        )}
      >
        <motion.div layout="position">
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
          />
        </motion.div>

        <motion.div
          layout="position"
          className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
        >
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
        </motion.div>
      </motion.div>
    </Reorder.Item>
  );
}
