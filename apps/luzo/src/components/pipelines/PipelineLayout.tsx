"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { usePipelineExecutionStore } from "@/lib/stores/usePipelineExecutionStore";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import type { ExportFormat } from "@/types/pipeline-debug";
import { DeletePipelineDialog } from "./DeletePipelineDialog";
import { PipelineHeader } from "./PipelineHeader";
import { PipelineSidebar } from "./PipelineSidebar";

interface PipelineLayoutProps {
  children: React.ReactNode;
  onRun?: () => void;
  onDebug?: () => void;
  onStop?: () => void;
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

  const { dbStatus, dbSchemaReady, dbUrl } = useSettingsStore();

  const { isGeneratingReport, isExportingPDF, reportsByPipelineId, aiProvider } =
    usePipelineDebugStore();
  const status = usePipelineExecutionStore((state) => state.status);
  const snapshots = usePipelineExecutionStore((state) => state.snapshots);
  const resetSession = usePipelineExecutionStore((state) => state.reset);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const activePipeline = pipelines.find((p) => p.id === activePipelineId);
  const canPersistToDb = dbStatus === "connected" && dbSchemaReady;
  const hasGeneratedReport = activePipelineId
    ? Boolean(reportsByPipelineId[activePipelineId])
    : false;
  const isDebugActive = status === "running" || status === "paused";
  const isAnyExecuting = isExecuting || isDebugActive;
  const noop = () => {};

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
          const response = await fetch("/api/db/collections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dbUrl,
              action: "delete-pipeline",
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
    setPendingDeleteIds([id]);
    setShowConfirmDialog(true);
  };

  const handleBatchDeleteClick = () => {
    if (selectedIds.length === 0) return;
    setPendingDeleteIds(selectedIds);
    setShowConfirmDialog(true);
  };
  const toggleSidebar = () => setSidebarOpen((open) => !open);
  const toggleSelectionMode = () => {
    setSelectionMode((enabled) => !enabled);
    setSelectedIds([]);
  };
  const toggleSelection = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
    );

  const confirmDelete = async () => {
    try {
      await deletePipelinesEverywhere(pendingDeleteIds);
      setShowConfirmDialog(false);
      setPendingDeleteIds([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete pipeline");
    }
  };

  return (
    <div className="flex flex-1 h-full min-h-0">
      <button
        type="button"
        className="lg:hidden fixed bottom-4 left-4 z-50 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        onClick={toggleSidebar}
      >
        <Pencil className="h-4 w-4" />
      </button>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={() => {}}
          role="button"
          tabIndex={-1}
        />
      )}

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
        onToggleSelectionMode={toggleSelectionMode}
        onToggleSelection={toggleSelection}
        onRenameStart={handleRenameStart}
        onRenameSave={handleRenameSave}
        onRenameCancel={() => setRenamingId(null)}
        onRenameValueChange={setRenameValue}
        onDeleteClick={handleDeleteClick}
        onBatchDeleteClick={handleBatchDeleteClick}
      />

      <div className="flex-1 flex flex-col min-h-0 relative">
        <PipelineHeader
          activePipelineName={activePipeline?.name || null}
          currentView={currentView}
          isExecuting={isAnyExecuting}
          activePipelineId={activePipelineId}
          snapshotsCount={snapshots.length}
          onSetView={setView}
          onRun={onRun ?? noop}
          onDebug={onDebug ?? noop}
          onStop={onStop ?? noop}
          onSaveToDb={onSaveToDb}
          onGenerateReport={onGenerateReport}
          onExportReport={onExportReport}
          canPersistToDb={canPersistToDb}
          isGeneratingReport={isGeneratingReport}
          isExportingPDF={isExportingPDF}
          isSavingToDb={isSavingToDb}
          hasGeneratedReport={hasGeneratedReport}
          hasAIProvider={Boolean(aiProvider.apiKey)}
        />

        <main className="flex-1 overflow-auto bg-muted/5 p-3 sm:p-6 custom-scrollbar">
          {activePipelineId ? (
            <motion.div
              key={`${activePipelineId}:${currentView}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="h-full min-h-0"
            >
              {children}
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
              <div className="p-4 rounded-full bg-muted/30">
                <Plus className="h-8 w-8 opacity-20" />
              </div>
              <p className="text-sm">Select or create a pipeline to get started</p>
            </div>
          )}
        </main>
      </div>

      {isExportingPDF && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-sm font-medium">Generating PDF...</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This may take a moment. Please don&apos;t close the page.
          </p>
        </div>
      )}

      <DeletePipelineDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        pendingDeleteIds={pendingDeleteIds}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
