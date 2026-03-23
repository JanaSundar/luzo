"use client";

import { AnimatePresence, Reorder, motion, useDragControls } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SaveToCollectionDialog } from "@/components/collections/SaveToCollectionDialog";
import { ImportCurlDialog } from "@/components/playground/request/ImportCurlDialog";
import { RequestForm } from "@/components/shared/RequestForm";
import type { TabId } from "@/components/shared/RequestFormTabs";
import { RequestUrlBar } from "@/components/shared/RequestUrlBar";
import { getAutocompleteSuggestions } from "@/lib/pipeline/autocomplete";
import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";
import { usePipelineExecutionStore } from "@/lib/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { cn } from "@/lib/utils";
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
  isExpanded: boolean;
  onToggleExpand: () => void;
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
  isExpanded,
  onToggleExpand,
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
  const [activeTab, setActiveTab] = useState<TabId>("params");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingId]);

  const suggestions = useMemo(() => {
    return getAutocompleteSuggestions(
      pipeline ?? undefined,
      step.id,
      envVars,
      runtimeVariables as Record<string, unknown>,
    );
  }, [pipeline, step.id, envVars, runtimeVariables]);

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

  const disabledTabs: TabId[] = step.method === "GET" || step.method === "HEAD" ? ["body"] : [];

  const commonFormProps = useMemo(
    () => ({
      ...step,
      suggestions,
      onChange: onUpdate,
      activeTab,
      onTabChange: setActiveTab,
      disabledTabs,
    }),
    [step, suggestions, onUpdate, activeTab, disabledTabs],
  );

  return (
    <Reorder.Item
      value={step}
      dragControls={dragControls}
      dragListener={false}
      layout
      className="relative w-full min-w-0 max-w-full"
    >
      <motion.div
        layout="position"
        animate={{ borderRadius: 22 }}
        style={{ borderRadius: 22, backfaceVisibility: "hidden" }}
        className={cn(
          "relative isolate flex w-full flex-col overflow-hidden border bg-background text-left shadow-sm transition-colors hover:border-primary/30",
        )}
      >
        <motion.div layout="position">
          <StepCardHeader
            executionHint={executionHint}
            index={index}
            name={step.name || `Request ${index + 1}`}
            isExpanded={isExpanded}
            renamingId={renamingId}
            stepId={step.id}
            renameValue={renameValue}
            renameInputRef={renameInputRef}
            dragControls={dragControls}
            onToggleExpand={onToggleExpand}
            onRenameStart={handleRenameStart}
            onRenameSave={handleRenameSave}
            onRenameCancel={() => setRenamingId(null)}
            onRenameValueChange={setRenameValue}
          />
        </motion.div>

        <motion.div
          layout="position"
          className="flex min-w-0 flex-wrap items-center gap-3 border-b border-border/40 px-4 py-3 sm:flex-nowrap"
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

        <AnimatePresence>
          {isExpanded ? (
            <motion.div
              layout="position"
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex min-h-0 w-full min-w-0 flex-col overflow-hidden px-4 pb-4 pt-3"
            >
              <motion.div
                layout="position"
                className="min-h-0 min-w-0 flex-1 overflow-hidden [scrollbar-gutter:stable]"
              >
                <RequestForm
                  {...commonFormProps}
                  animateTabContent={false}
                  className="max-h-[430px]"
                />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </Reorder.Item>
  );
}
