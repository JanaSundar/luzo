"use client";

import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { PipelineView } from "@/types";
import type { ExportFormat } from "@/types/pipeline-debug";
import { PipelineHeader } from "./PipelineHeader";
import { PipelineLayoutEmptyState } from "./PipelineLayoutChrome";

interface PipelineLayoutContentProps {
  activePipelineId: string | null;
  activePipelineName: string | null;
  children: ReactNode;
  currentView: PipelineView;
  executionBlockedReason: string | null;
  hasAIProvider: boolean;
  hasGeneratedReport: boolean;
  isExecuting: boolean;
  isExportingPDF: boolean;
  isGeneratingReport: boolean;
  isSavingToDb: boolean;
  canPersistToDb: boolean;
  onSetView: (view: PipelineView) => void;
  onRun: () => void;
  onDebug: () => void;
  onStop: () => void;
  onRetry?: () => void;
  onSaveToDb?: () => void;
  onGenerateReport?: (force?: boolean) => void;
  onExportReport?: (format: ExportFormat) => void;
  snapshotsCount: number;
}

export function PipelineLayoutContent({
  activePipelineId,
  activePipelineName,
  children,
  currentView,
  executionBlockedReason,
  hasAIProvider,
  hasGeneratedReport,
  isExecuting,
  isExportingPDF,
  isGeneratingReport,
  isSavingToDb,
  canPersistToDb,
  onSetView,
  onRun,
  onDebug,
  onStop,
  onRetry,
  onSaveToDb,
  onGenerateReport,
  onExportReport,
  snapshotsCount,
}: PipelineLayoutContentProps) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <PipelineHeader
        activePipelineName={activePipelineName}
        currentView={currentView}
        isExecuting={isExecuting}
        activePipelineId={activePipelineId}
        executionBlockedReason={executionBlockedReason}
        snapshotsCount={snapshotsCount}
        onSetView={onSetView}
        onRun={onRun}
        onDebug={onDebug}
        onStop={onStop}
        onRetry={onRetry}
        onSaveToDb={onSaveToDb}
        onGenerateReport={onGenerateReport}
        onExportReport={onExportReport}
        canPersistToDb={canPersistToDb}
        isGeneratingReport={isGeneratingReport}
        isExportingPDF={isExportingPDF}
        isSavingToDb={isSavingToDb}
        hasGeneratedReport={hasGeneratedReport}
        hasAIProvider={hasAIProvider}
      />

      <main className="custom-scrollbar flex-1 overflow-auto bg-muted/5 p-3 sm:p-6">
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
          <PipelineLayoutEmptyState />
        )}
      </main>

      {isExportingPDF ? (
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
      ) : null}
    </div>
  );
}
