"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useSavePipelineToDb } from "./useSavePipelineToDb";
import { usePipelinePageController } from "./usePipelinePageController";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

// Dynamically import heavy pipeline components
const PipelineBuilder = dynamic(
  () => import("@/components/pipelines/PipelineBuilder").then((mod) => mod.PipelineBuilder),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" variant="dots" />
      </div>
    ),
  },
);

const DebuggerShell = dynamic(
  () => import("@/components/pipelines/DebuggerShell").then((mod) => mod.DebuggerShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" variant="dots" />
      </div>
    ),
  },
);

const AIConfigurator = dynamic(
  () => import("@/components/pipelines/AIConfigurator").then((mod) => mod.AIConfigurator),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" variant="dots" />
      </div>
    ),
  },
);

const ReportPreview = dynamic(
  () => import("@/components/pipelines/ReportPreview").then((mod) => mod.ReportPreview),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" variant="dots" />
      </div>
    ),
  },
);

// PipelineLayout remains static as it's the structural frame
import { PipelineLayout } from "@/components/pipelines/PipelineLayout";

function PipelinesPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pipelines = usePipelineStore((state) => state.pipelines);
  const activePipelineId = usePipelineStore((state) => state.activePipelineId);
  const currentView = usePipelineStore((state) => state.currentView);
  const addPipeline = usePipelineStore((state) => state.addPipeline);
  const mergeMissingPipelines = usePipelineStore((state) => state.mergeMissingPipelines);
  const { dbStatus, dbSchemaReady, dbUrl } = useSettingsStore();
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
  const lastMergedDbUrlRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (!hydrated) return;
    if (dbStatus !== "connected" || !dbSchemaReady || !dbUrl.trim()) return;

    const normalizedDbUrl = dbUrl.trim();
    if (lastMergedDbUrlRef.current === normalizedDbUrl) return;

    let cancelled = false;

    const syncMissingDbPipelines = async () => {
      try {
        const response = await fetch("/api/db/pipelines", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dbUrl: normalizedDbUrl,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load pipelines from DB");
        }
        if (cancelled) return;

        mergeMissingPipelines(data.pipelines ?? []);
        lastMergedDbUrlRef.current = normalizedDbUrl;
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Unable to load pipelines from database",
          );
        }
      }
    };

    void syncMissingDbPipelines();

    return () => {
      cancelled = true;
    };
  }, [dbSchemaReady, dbStatus, dbUrl, hydrated, mergeMissingPipelines]);

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
