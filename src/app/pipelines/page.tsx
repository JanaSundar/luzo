"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AIConfigurator } from "@/components/pipelines/AIConfigurator";
import { DebuggerShell } from "@/components/pipelines/DebuggerShell";
import { PipelineBuilder } from "@/components/pipelines/PipelineBuilder";
import { PipelineLayout } from "@/components/pipelines/PipelineLayout";
import { ReportPreview } from "@/components/pipelines/ReportPreview";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { useSavePipelineToDb } from "./useSavePipelineToDb";
import { usePipelinePageController } from "./usePipelinePageController";

function PipelinesPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pipelines = usePipelineStore((state) => state.pipelines);
  const activePipelineId = usePipelineStore((state) => state.activePipelineId);
  const currentView = usePipelineStore((state) => state.currentView);
  const addPipeline = usePipelineStore((state) => state.addPipeline);
  const requestedCollectionId = searchParams.get("generateFromCollection");
  const activePipeline = pipelines.find((pipeline) => pipeline.id === activePipelineId) ?? null;
  const { isSaving, savePipelineToDb } = useSavePipelineToDb();

  const {
    handleRun,
    handleDebug,
    handleRunFromStep,
    handleStop,
    handleRetry,
    handleStep,
    handleResume,
    handleGenerateReport,
    handleExportReport,
  } = usePipelinePageController();

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsubscribe = usePipelineStore.persist.onFinishHydration(() => setHydrated(true));
    if (usePipelineStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (hydrated && pipelines.length === 0) {
      addPipeline("API Pipeline");
    }
  }, [addPipeline, hydrated, pipelines.length]);

  const clearRequestedCollection = () => {
    if (!requestedCollectionId) return;
    router.replace(pathname);
  };

  return (
    <PipelineLayout
      onRun={handleRun}
      onDebug={handleDebug}
      onStop={handleStop}
      onSaveToDb={() => void savePipelineToDb(activePipeline)}
      onGenerateReport={handleGenerateReport}
      onExportReport={handleExportReport}
      isSavingToDb={isSaving}
    >
      {currentView === "builder" && (
        <PipelineBuilder
          onClearRequestedCollection={clearRequestedCollection}
          onRunFromStep={handleRunFromStep}
          requestedCollectionId={requestedCollectionId}
        />
      )}
      {currentView === "stream" && (
        <DebuggerShell
          onStep={handleStep}
          onResume={handleResume}
          onRetry={handleRetry}
          onStop={handleStop}
          onRunAuto={handleRun}
        />
      )}
      {currentView === "ai-config" && <AIConfigurator />}
      {currentView === "report" && <ReportPreview />}
    </PipelineLayout>
  );
}

export default function PipelinesPage() {
  return (
    <Suspense fallback={null}>
      <PipelinesPageContent />
    </Suspense>
  );
}
