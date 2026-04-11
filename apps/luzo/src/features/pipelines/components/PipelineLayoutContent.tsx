"use client";

import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import type { PipelineView } from "@/types";
import type { ExportFormat } from "@/types/pipeline-debug";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { PipelineHeader } from "./PipelineHeader";
import { PipelineExecutionDrawer } from "./PipelineExecutionDrawer";
import { PipelineLayoutEmptyState } from "./PipelineLayoutChrome";

const AUTO_OPEN_TIMELINE_KEY = "luzo:pipeline:auto-open-timeline";
const EXECUTION_DRAWER_SIZE_KEY = "luzo:pipeline:execution-drawer-size:v2";
const DEFAULT_DRAWER_SIZE = 56;
const MIN_DRAWER_SIZE = 24;
const MAX_DRAWER_SIZE = 96;

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
  onStep?: () => void;
  onResume?: () => void;
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
  onStep,
  onResume,
  onRetry,
  onSaveToDb,
  onGenerateReport,
  onExportReport,
  snapshotsCount,
}: PipelineLayoutContentProps) {
  const executionStatus = usePipelineExecutionStore((state) => state.status);
  const contentRef = useRef<HTMLDivElement>(null);
  const builderAreaRef = useRef<HTMLDivElement>(null);
  const previousExecutionStatusRef = useRef(executionStatus);
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const [autoOpenTimeline, setAutoOpenTimeline] = useState(true);
  const [executionDrawerSize, setExecutionDrawerSize] = useState(DEFAULT_DRAWER_SIZE);
  const [isExecutionDrawerOpen, setIsExecutionDrawerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedAutoOpen = window.localStorage.getItem(AUTO_OPEN_TIMELINE_KEY);
    if (storedAutoOpen === "false") {
      setAutoOpenTimeline(false);
    }

    const storedDrawerSize = Number(window.localStorage.getItem(EXECUTION_DRAWER_SIZE_KEY));
    if (Number.isFinite(storedDrawerSize)) {
      setExecutionDrawerSize(
        Math.min(MAX_DRAWER_SIZE, Math.max(MIN_DRAWER_SIZE, storedDrawerSize)),
      );
    }

    setPreferencesHydrated(true);
  }, []);

  useEffect(() => {
    if (!preferencesHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(AUTO_OPEN_TIMELINE_KEY, String(autoOpenTimeline));
  }, [autoOpenTimeline, preferencesHydrated]);

  useEffect(() => {
    if (!preferencesHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(EXECUTION_DRAWER_SIZE_KEY, String(executionDrawerSize));
  }, [executionDrawerSize, preferencesHydrated]);

  useEffect(() => {
    if (currentView !== "builder") return;

    const node = builderAreaRef.current;
    if (!node) return;

    const clampDrawerSize = () => {
      setExecutionDrawerSize((currentSize) => Math.min(currentSize, MAX_DRAWER_SIZE));
    };

    clampDrawerSize();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(clampDrawerSize);
    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, [currentView]);

  useEffect(() => {
    const previousStatus = previousExecutionStatusRef.current;
    const nextIsActive = executionStatus === "running" || executionStatus === "paused";
    const previousWasActive = previousStatus === "running" || previousStatus === "paused";

    if (currentView === "builder" && autoOpenTimeline && nextIsActive && !previousWasActive) {
      setIsExecutionDrawerOpen(true);
    }

    previousExecutionStatusRef.current = executionStatus;
  }, [autoOpenTimeline, currentView, executionStatus]);

  const hasExecutionHistory =
    snapshotsCount > 0 ||
    executionStatus === "running" ||
    executionStatus === "paused" ||
    executionStatus === "error" ||
    executionStatus === "completed" ||
    executionStatus === "aborted" ||
    executionStatus === "interrupted";

  const runWithDrawer = useCallback(() => {
    if (currentView === "builder" && autoOpenTimeline) {
      setIsExecutionDrawerOpen(true);
    }
    onRun();
  }, [autoOpenTimeline, currentView, onRun]);

  const debugWithDrawer = useCallback(() => {
    if (currentView === "builder" && autoOpenTimeline) {
      setIsExecutionDrawerOpen(true);
    }
    onDebug();
  }, [autoOpenTimeline, currentView, onDebug]);

  const startDrawerResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const container = builderAreaRef.current ?? contentRef.current;
      if (!container) return;

      event.preventDefault();

      const { height } = container.getBoundingClientRect();
      const startY = event.clientY;
      const startSize = executionDrawerSize;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaPercent = ((startY - moveEvent.clientY) / height) * 100;
        const nextSize = Math.min(
          MAX_DRAWER_SIZE,
          Math.max(MIN_DRAWER_SIZE, startSize + deltaPercent),
        );
        setExecutionDrawerSize(nextSize);
      };

      const stopResizing = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", stopResizing);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", stopResizing, { once: true });
    },
    [executionDrawerSize],
  );

  const builderContent = useMemo(
    () => (
      <>
        <main className="custom-scrollbar min-h-0 flex-1 overflow-auto bg-muted/5 p-3 sm:p-6">
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

        {activePipelineId && isExecutionDrawerOpen ? (
          <div
            className="absolute inset-x-3 bottom-3 z-30 min-h-0 overflow-hidden sm:inset-x-6"
            style={{ height: `${executionDrawerSize}%` }}
          >
            <PipelineExecutionDrawer
              onClose={() => setIsExecutionDrawerOpen(false)}
              onResizeStart={startDrawerResize}
              onStep={onStep}
              onResume={onResume}
              onRetry={onRetry}
              onStop={onStop}
              onRunAuto={onRun}
            />
          </div>
        ) : null}
      </>
    ),
    [
      activePipelineId,
      children,
      currentView,
      executionDrawerSize,
      executionStatus,
      hasExecutionHistory,
      isExecutionDrawerOpen,
      onResume,
      onRetry,
      onRun,
      onStep,
      onStop,
      snapshotsCount,
      startDrawerResize,
    ],
  );

  return (
    <div ref={contentRef} className="relative flex min-h-0 flex-1 flex-col">
      <PipelineHeader
        activePipelineName={activePipelineName}
        currentView={currentView}
        isExecuting={isExecuting}
        activePipelineId={activePipelineId}
        executionBlockedReason={executionBlockedReason}
        onSetView={onSetView}
        onRun={runWithDrawer}
        onDebug={debugWithDrawer}
        onStop={onStop}
        onSaveToDb={onSaveToDb}
        onGenerateReport={onGenerateReport}
        onExportReport={onExportReport}
        canPersistToDb={canPersistToDb}
        isGeneratingReport={isGeneratingReport}
        isExportingPDF={isExportingPDF}
        isSavingToDb={isSavingToDb}
        hasGeneratedReport={hasGeneratedReport}
        hasAIProvider={hasAIProvider}
        autoOpenTimeline={autoOpenTimeline}
        isExecutionDrawerOpen={isExecutionDrawerOpen}
        onAutoOpenTimelineChange={setAutoOpenTimeline}
        onToggleExecutionDrawer={() => setIsExecutionDrawerOpen((open) => !open)}
      />

      {currentView === "builder" ? (
        <div ref={builderAreaRef} className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {builderContent}
        </div>
      ) : (
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
      )}

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
