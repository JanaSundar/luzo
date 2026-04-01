"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getPipelineExecutionSupport } from "@/features/pipeline/canvas-flow";
import { usePipelineDebugStore } from "@/stores/usePipelineDebugStore";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { usePipelineStore } from "@/stores/usePipelineStore";

import type { ExportFormat } from "@/types/pipeline-debug";
import { DeletePipelineDialog } from "./DeletePipelineDialog";
import { PipelineLayoutContent } from "./PipelineLayoutContent";
import { PipelineSidebar } from "./PipelineSidebar";
import { PipelineMobileSidebarToggle } from "./PipelineLayoutChrome";

interface PipelineLayoutProps {
  children: React.ReactNode;
  onRun?: () => void;
  onDebug?: () => void;
  onStop?: () => void;
  onRetry?: () => void;
  onSaveToDb?: () => void;
  onGenerateReport?: (force?: boolean) => void;
  onExportReport?: (format: ExportFormat) => void;
  isSavingToDb?: boolean;
}

export function PipelineLayout({
  children,
  onRun,
  onDebug,
  onStop,
  onRetry,
  onSaveToDb,
  onGenerateReport,
  onExportReport,
  isSavingToDb = false,
}: PipelineLayoutProps) {
  const {
    pipelines,
    activePipelineId,
    setActivePipeline,
    addPipeline,
    deletePipeline,
    deletePipelines,
    updatePipeline,
    currentView,
    setView,
    executing: isExecuting,
  } = usePipelineStore();

  const skipDeleteConfirmation = useSettingsStore((s) => s.skipDeletePipelineConfirm);
  const setSkipDeleteConfirmation = useSettingsStore((s) => s.setSkipDeletePipelineConfirm);
  const { dbStatus, dbSchemaReady, dbUrl } = useSettingsStore();

  const { isGeneratingReport, isExportingPDF, reportsByPipelineId, aiProvider } =
    usePipelineDebugStore();
  const status = usePipelineExecutionStore((state) => state.status);
  const snapshots = usePipelineExecutionStore((state) => state.snapshots);
  const resetSession = usePipelineExecutionStore((state) => state.reset);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [skipConfirmTemp, setSkipConfirmTemp] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const activePipeline = pipelines.find((p) => p.id === activePipelineId);
  const executionSupport = activePipeline ? getPipelineExecutionSupport(activePipeline) : null;
  const canPersistToDb = dbStatus === "connected" && dbSchemaReady;
  const hasGeneratedReport = activePipelineId
    ? Boolean(reportsByPipelineId[activePipelineId])
    : false;
  const isDebugActive = status === "running" || status === "paused";
  const isAnyExecuting = isExecuting || isDebugActive;

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleRenameStart = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const handleRenameSave = () => {
    if (renamingId && renameValue.trim()) {
      updatePipeline(renamingId, { name: renameValue.trim() });
    }
    setRenamingId(null);
  };

  const deletePipelinesEverywhere = async (ids: string[]) => {
    if (ids.length === 0) return;

    if (canPersistToDb && dbUrl) {
      await Promise.all(
        ids.map(async (id) => {
          const response = await fetch("/api/db/pipelines", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dbUrl,
              id,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Unable to delete pipeline from DB");
          }
        }),
      );
    }

    resetSession();
    if (ids.length === 1) {
      deletePipeline(ids[0]!);
    } else {
      deletePipelines(ids);
      setSelectedIds([]);
      setSelectionMode(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    if (skipDeleteConfirmation) {
      void deletePipelinesEverywhere([id]).catch((error) => {
        toast.error(error instanceof Error ? error.message : "Unable to delete pipeline");
      });
    } else {
      setPendingDeleteIds([id]);
      setShowConfirmDialog(true);
    }
  };

  const handleBatchDeleteClick = () => {
    if (selectedIds.length === 0) return;
    if (skipDeleteConfirmation) {
      void deletePipelinesEverywhere(selectedIds).catch((error) => {
        toast.error(error instanceof Error ? error.message : "Unable to delete pipelines");
      });
    } else {
      setPendingDeleteIds(selectedIds);
      setShowConfirmDialog(true);
    }
  };

  const confirmDelete = async () => {
    try {
      await deletePipelinesEverywhere(pendingDeleteIds);
      if (skipConfirmTemp) setSkipDeleteConfirmation(true);
      setShowConfirmDialog(false);
      setPendingDeleteIds([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete pipeline");
    }
  };

  return (
    <div className="flex flex-1 h-full min-h-0">
      <PipelineMobileSidebarToggle
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((current) => !current)}
      />

      <PipelineSidebar
        pipelines={pipelines}
        activePipelineId={activePipelineId}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        sidebarOpen={sidebarOpen}
        renamingId={renamingId}
        renameValue={renameValue}
        renameInputRef={renameInputRef}
        onAddPipeline={addPipeline}
        onSetActivePipeline={setActivePipeline}
        onToggleSelectionMode={() => {
          setSelectionMode(!selectionMode);
          setSelectedIds([]);
        }}
        onToggleSelection={(id) =>
          setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
          )
        }
        onRenameStart={handleRenameStart}
        onRenameSave={handleRenameSave}
        onRenameCancel={() => setRenamingId(null)}
        onRenameValueChange={setRenameValue}
        onDeleteClick={handleDeleteClick}
        onBatchDeleteClick={handleBatchDeleteClick}
      />

      <PipelineLayoutContent
        activePipelineId={activePipelineId}
        activePipelineName={activePipeline?.name || null}
        currentView={currentView}
        executionBlockedReason={
          executionSupport?.supported === false ? executionSupport.reason : null
        }
        snapshotsCount={snapshots.length}
        isExecuting={isAnyExecuting}
        onSetView={setView}
        onRun={onRun || (() => {})}
        onDebug={onDebug || (() => {})}
        onStop={onStop || (() => {})}
        onRetry={onRetry}
        onSaveToDb={onSaveToDb}
        onGenerateReport={onGenerateReport}
        onExportReport={onExportReport}
        canPersistToDb={canPersistToDb}
        isGeneratingReport={isGeneratingReport}
        isExportingPDF={isExportingPDF}
        isSavingToDb={isSavingToDb}
        hasGeneratedReport={hasGeneratedReport}
        hasAIProvider={Boolean(aiProvider.apiKey)}
      >
        {children}
      </PipelineLayoutContent>

      <DeletePipelineDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        pendingDeleteIds={pendingDeleteIds}
        skipConfirmTemp={skipConfirmTemp}
        onSkipConfirmChange={setSkipConfirmTemp}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
