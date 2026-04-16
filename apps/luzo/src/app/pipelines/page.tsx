"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useSavePipelineToDb } from "./useSavePipelineToDb";
import { usePipelinePageController } from "./usePipelinePageController";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { usePipelineStore } from "@/features/pipelines/store/usePipelineStore";

// Dynamically import heavy pipeline components
const FlowEditorPage = dynamic(
  () => import("@/features/flow-editor/FlowEditorPage").then((mod) => mod.FlowEditorPage),
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
  () => import("@/features/pipelines/components/AIConfigurator").then((mod) => mod.AIConfigurator),
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
  () => import("@/features/pipelines/components/ReportPreview").then((mod) => mod.ReportPreview),
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
import { PipelineLayout } from "@/features/pipelines/components/PipelineLayout";

function PipelinesPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pipelines = usePipelineStore((state) => state.pipelines);
  const activePipelineId = usePipelineStore((state) => state.activePipelineId);
  const currentView = usePipelineStore((state) => state.currentView);
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
    handleStep,
    handleResume,
    handleRetry,
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
    <>
      <PipelineLayout
        onRun={handleRun}
        onDebug={handleDebug}
        onStop={handleStop}
        onStep={handleStep}
        onResume={handleResume}
        onRetry={handleRetry}
        onSaveToDb={() => void savePipelineToDb(activePipeline)}
        onGenerateReport={handleGenerateReport}
        onExportReport={handleExportReport}
        isSavingToDb={isSaving}
      >
        {currentView === "builder" && (
          <FlowEditorPage
            onClearRequestedCollection={clearRequestedCollection}
            onRunFromStep={handleRunFromStep}
            requestedCollectionId={requestedCollectionId}
          />
        )}
        {currentView === "ai-config" && <AIConfigurator />}
        {currentView === "report" && <ReportPreview />}
      </PipelineLayout>
    </>
  );
}

export default function PipelinesPage() {
  return (
    <Suspense fallback={null}>
      <PipelinesPageContent />
    </Suspense>
  );
}
