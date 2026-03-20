"use client";

import { Bug, Play, RefreshCw, Settings2, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PipelineView } from "@/types";
import type { ExportFormat } from "@/types/pipeline-debug";
import { ReportExportMenu } from "./ReportExportMenu";

interface PipelineHeaderProps {
  activePipelineName: string | null;
  currentView: PipelineView;
  isExecuting: boolean;
  activePipelineId: string | null;
  snapshotsCount?: number;
  onSetView: (view: PipelineView) => void;
  onRun: () => void;
  onDebug: () => void;
  onStop: () => void;
  onGenerateReport?: (force?: boolean) => void;
  onExportReport?: (format: ExportFormat) => void;
  isGeneratingReport?: boolean;
  isExportingPDF?: boolean;
  hasGeneratedReport?: boolean;
  hasAIProvider?: boolean;
}

const VIEWS: { id: PipelineView; label: string }[] = [
  { id: "builder", label: "Pipeline Builder" },
  { id: "stream", label: "Response Stream" },
  { id: "ai-config", label: "AI Configurator" },
  { id: "report", label: "Report Preview" },
];

export function PipelineHeader({
  activePipelineName,
  currentView,
  isExecuting,
  activePipelineId,
  snapshotsCount = 0,
  onSetView,
  onRun,
  onDebug,
  onStop,
  onGenerateReport,
  onExportReport,
  isGeneratingReport,
  isExportingPDF = false,
  hasGeneratedReport = false,
  hasAIProvider = false,
}: PipelineHeaderProps) {
  const showExecutionControls = currentView === "builder" || currentView === "stream";
  const showReportControls = currentView === "ai-config" || currentView === "report";
  const isStreamView = currentView === "stream";
  const hasPipelineRun = snapshotsCount > 0;

  return (
    <div className="z-10 flex min-h-14 flex-col justify-between gap-2 border-b bg-background px-3 py-2 sm:flex-row sm:items-center sm:gap-0 sm:px-6 sm:py-0">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto sm:gap-4">
        <h1 className="shrink-0 text-sm font-bold tracking-tight whitespace-nowrap sm:text-lg">
          {activePipelineName || "Select a Pipeline"}
        </h1>
        <nav className="flex items-center gap-0.5 sm:gap-1 bg-muted/50 p-0.5 sm:p-1 rounded-lg shrink-0">
          {VIEWS.map((v) => (
            <button
              type="button"
              key={v.id}
              onClick={() => onSetView(v.id)}
              className={cn(
                "px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold rounded-md transition-all whitespace-nowrap",
                currentView === v.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {showExecutionControls &&
          (isExecuting ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="gap-1.5 h-8 font-bold"
              onClick={onStop}
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span className="hidden sm:inline">Stop</span>
            </Button>
          ) : isStreamView && hasPipelineRun ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5 h-8 bg-foreground text-background hover:bg-foreground/90 font-bold"
              onClick={() => onSetView("ai-config")}
              disabled={!activePipelineId}
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Go to Configurator</span>
            </Button>
          ) : isStreamView ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5 h-8 bg-foreground text-background hover:bg-foreground/90 font-bold"
              onClick={onRun}
              disabled={!activePipelineId}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span className="hidden sm:inline">Run</span>
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 font-bold"
                onClick={onDebug}
                disabled={!activePipelineId}
              >
                <Bug className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Debug</span>
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 h-8 bg-foreground text-background hover:bg-foreground/90 font-bold"
                onClick={onRun}
                disabled={!activePipelineId}
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span className="hidden sm:inline">Run</span>
              </Button>
            </>
          ))}

        {showReportControls && (
          <>
            <Button
              type="button"
              size="sm"
              className="gap-1.5 h-8 font-bold bg-green-600 text-white hover:bg-green-700 shadow-sm"
              onClick={() => {
                const isRegenerate = currentView === "report" && hasGeneratedReport;
                onGenerateReport?.(isRegenerate);
              }}
              disabled={isGeneratingReport || !activePipelineId}
              title={!hasAIProvider ? "Configure AI provider in settings" : undefined}
            >
              {isGeneratingReport ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {currentView === "report" && hasGeneratedReport ? "Regenerate" : "Report"}
              </span>
            </Button>
            {currentView === "report" && hasGeneratedReport && (
              <ReportExportMenu
                disabled={isExportingPDF}
                onExport={(format) => onExportReport?.(format)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
