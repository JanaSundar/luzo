"use client";

import { useEffect, useState } from "react";
import { AIConfigurator } from "@/components/pipelines/AIConfigurator";
import { PipelineBuilder } from "@/components/pipelines/PipelineBuilder";
import { PipelineLayout } from "@/components/pipelines/PipelineLayout";
import { ReportPreview } from "@/components/pipelines/ReportPreview";
import { ResponseStream } from "@/components/pipelines/ResponseStream";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { usePipelinePageController } from "./usePipelinePageController";

export default function PipelinesPage() {
  const pipelines = usePipelineStore((state) => state.pipelines);
  const currentView = usePipelineStore((state) => state.currentView);
  const addPipeline = usePipelineStore((state) => state.addPipeline);
  const {
    handleRun,
    handleDebug,
    handleRunFromStep,
    handleStop,
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

  return (
    <PipelineLayout
      onRun={handleRun}
      onDebug={handleDebug}
      onStop={handleStop}
      onGenerateReport={handleGenerateReport}
      onExportReport={handleExportReport}
    >
      {currentView === "builder" && <PipelineBuilder onRunFromStep={handleRunFromStep} />}
      {currentView === "stream" && <ResponseStream />}
      {currentView === "ai-config" && <AIConfigurator />}
      {currentView === "report" && <ReportPreview />}
    </PipelineLayout>
  );
}
