"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { usePipelineRuntimeStore } from "@/lib/stores/usePipelineRuntimeStore";
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
  onGenerateReport?: () => void;
  onExportReport?: (format: ExportFormat) => void;
}

export function PipelineLayout({
  children,
  onRun,
  onDebug,
  onStop,
  onGenerateReport,
  onExportReport,
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
    isExecuting,
    preferences,
    setPreferences,
  } = usePipelineStore();

  const {
    isGeneratingReport,
    isExportingPDF,
    isReportDirty,
    reportsByPipelineId,
    selectedSignals,
  } = usePipelineDebugStore();
  const runtime = usePipelineRuntimeStore((state) => state.runtime);
  const snapshots = usePipelineRuntimeStore((state) => state.snapshots);
  const resetSession = usePipelineRuntimeStore((state) => state.resetSession);

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
  const hasGeneratedReport = activePipelineId
    ? Boolean(reportsByPipelineId[activePipelineId])
    : false;
  const isDebugActive = runtime.status === "running" || runtime.status === "paused";
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

  const handleDeleteClick = (id: string) => {
    if (preferences.skipDeleteConfirmation) {
      resetSession();
      deletePipeline(id);
    } else {
      setPendingDeleteIds([id]);
      setShowConfirmDialog(true);
    }
  };

  const handleBatchDeleteClick = () => {
    if (selectedIds.length === 0) return;
    if (preferences.skipDeleteConfirmation) {
      resetSession();
      deletePipelines(selectedIds);
      setSelectedIds([]);
      setSelectionMode(false);
    } else {
      setPendingDeleteIds(selectedIds);
      setShowConfirmDialog(true);
    }
  };

  const confirmDelete = () => {
    resetSession();
    if (pendingDeleteIds.length === 1) {
      deletePipeline(pendingDeleteIds[0]);
    } else {
      deletePipelines(pendingDeleteIds);
      setSelectedIds([]);
      setSelectionMode(false);
    }
    if (skipConfirmTemp) setPreferences({ skipDeleteConfirmation: true });
    setShowConfirmDialog(false);
    setPendingDeleteIds([]);
  };

  return (
    <div className="flex flex-1 h-full min-h-0">
      <button
        type="button"
        className="lg:hidden fixed bottom-4 left-4 z-50 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Pencil className="h-4 w-4" />
      </button>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
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
        onToggleSelectionMode={() => {
          setSelectionMode(!selectionMode);
          setSelectedIds([]);
        }}
        onToggleSelection={(id) =>
          setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
          )
        }
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
          onRun={onRun || (() => {})}
          onDebug={onDebug || (() => {})}
          onStop={onStop || (() => {})}
          onGenerateReport={onGenerateReport}
          onExportReport={onExportReport}
          isGeneratingReport={isGeneratingReport}
          isExportingPDF={isExportingPDF}
          isReportDirty={isReportDirty}
          hasGeneratedReport={hasGeneratedReport}
          selectedSignalsCount={selectedSignals.length}
        />

        <main className="flex-1 overflow-auto bg-muted/5 p-3 sm:p-6 custom-scrollbar">
          {activePipelineId ? (
            <motion.div
              key={currentView}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
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
        skipConfirmTemp={skipConfirmTemp}
        onSkipConfirmChange={setSkipConfirmTemp}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
