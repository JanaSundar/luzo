"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SaveToCollectionDialog } from "@/components/collections/SaveToCollectionDialog";
import { RequestForm } from "@/components/shared/RequestForm";
import type { TabId } from "@/components/shared/RequestFormTabs";
import { RequestUrlBar } from "@/components/shared/RequestUrlBar";
import { getAutocompleteSuggestions } from "@/lib/pipeline/autocomplete";
import { usePipelineRuntimeStore } from "@/lib/stores/usePipelineRuntimeStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { cn } from "@/lib/utils";
import type { PipelineStep } from "@/types";
import { StepCardHeader } from "./StepCardHeader";
import { StepCardMenu } from "./StepCardMenu";

interface StepCardProps {
  step: PipelineStep;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<PipelineStep>) => void;
  onRunFromHere: () => void;
  onRunFromHereFresh: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export function StepCard({
  step,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRunFromHere,
  onRunFromHereFresh,
  onDuplicate,
  onDelete,
  dragHandleProps,
}: StepCardProps) {
  const { activePipelineId, pipelines } = usePipelineStore();
  const { getActiveEnvironmentVariables } = usePlaygroundStore();
  const runtimeVariables = usePipelineRuntimeStore((s) => s.runtimeVariables);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("params");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const pipeline = pipelines.find((p) => p.id === activePipelineId);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingId]);

  // Pass active environment variables and runtime vars for nuclear-level suggestions
  const suggestions = getAutocompleteSuggestions(
    pipeline,
    step.id,
    getActiveEnvironmentVariables(),
    runtimeVariables as Record<string, unknown>
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

  const disabledTabs: TabId[] = step.method === "GET" || step.method === "HEAD" ? ["body"] : [];

  return (
    <motion.div
      className={cn(
        "bg-background border rounded-2xl shadow-sm overflow-visible transition-all duration-300",
        isExpanded ? "ring-1 ring-primary/20 shadow-lg" : "hover:border-primary/30"
      )}
    >
      <StepCardHeader
        index={index}
        name={step.name || `Request ${index + 1}`}
        isExpanded={isExpanded}
        renamingId={renamingId}
        stepId={step.id}
        renameValue={renameValue}
        renameInputRef={renameInputRef}
        dragHandleProps={dragHandleProps}
        onToggleExpand={onToggleExpand}
        onRenameStart={handleRenameStart}
        onRenameSave={handleRenameSave}
        onRenameCancel={() => setRenamingId(null)}
        onRenameValueChange={setRenameValue}
      />

      <div className="px-4 py-3 flex items-center gap-3">
        <RequestUrlBar
          method={step.method}
          url={step.url || ""}
          suggestions={suggestions}
          onMethodChange={(method) => onUpdate({ method })}
          onUrlChange={(url) => onUpdate({ url })}
          className="flex-1 bg-muted/30"
        />
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

      {isExpanded && (
        <>
          <div className="px-4 pb-3 shrink-0">
            <RequestForm
              headers={step.headers}
              params={step.params}
              body={step.body}
              bodyType={step.bodyType}
              formDataFields={step.formDataFields}
              auth={step.auth}
              preRequestEditorType={step.preRequestEditorType}
              testEditorType={step.testEditorType}
              preRequestRules={step.preRequestRules}
              testRules={step.testRules}
              preRequestScript={step.preRequestScript}
              testScript={step.testScript}
              suggestions={suggestions}
              onChange={(updates) => onUpdate(updates)}
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                if (!isExpanded) onToggleExpand();
              }}
              instanceId={step.id}
              showTabsOnly
              disabledTabs={disabledTabs}
            />
          </div>

          <div className="px-4 pb-3 flex-1 overflow-y-auto min-h-0 max-h-[400px]">
            <RequestForm
              headers={step.headers}
              params={step.params}
              body={step.body}
              bodyType={step.bodyType}
              formDataFields={step.formDataFields}
              auth={step.auth}
              preRequestEditorType={step.preRequestEditorType}
              testEditorType={step.testEditorType}
              preRequestRules={step.preRequestRules}
              testRules={step.testRules}
              preRequestScript={step.preRequestScript}
              testScript={step.testScript}
              suggestions={suggestions}
              onChange={(updates) => onUpdate(updates)}
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                if (!isExpanded) onToggleExpand();
              }}
              instanceId={step.id}
              showContentOnly
              disabledTabs={disabledTabs}
            />
          </div>
        </>
      )}

      {isExpanded && <div className="px-4 pb-4 h-px bg-muted/20" />}
    </motion.div>
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
        className
      )}
    >
      {children}
    </span>
  );
}
