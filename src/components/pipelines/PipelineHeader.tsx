"use client";

import { Bug, FileDown, Play, RefreshCw, Settings2, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PipelineView } from "@/types";

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
  onGenerateReport?: () => void;
  onExportPDF?: () => void;
  isGeneratingReport?: boolean;
  isExportingPDF?: boolean;
  isReportDirty?: boolean;
  reportOutput?: string | null;
  selectedSignalsCount?: number;
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
  onExportPDF,
  isGeneratingReport,
  isExportingPDF = false,
  isReportDirty,
  reportOutput,
  selectedSignalsCount = 0,
}: PipelineHeaderProps) {
  const showExecutionControls = currentView === "builder" || currentView === "stream";
  const showReportControls = currentView === "ai-config" || currentView === "report";
  const isStreamView = currentView === "stream";
  const hasPipelineRun = snapshotsCount > 0;

  return (
    <div className="min-h-14 border-b flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-6 py-2 sm:py-0 gap-2 sm:gap-0 bg-background/50 backdrop-blur-sm z-10">
      <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
        <h1 className="text-sm sm:text-lg font-bold tracking-tight whitespace-nowrap">
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
                  : "text-muted-foreground hover:text-foreground"
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
              className={cn(
                "gap-1.5 h-8 font-bold",
                isReportDirty && reportOutput
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-foreground text-background hover:bg-foreground/90"
              )}
              onClick={onGenerateReport}
              disabled={isGeneratingReport || selectedSignalsCount === 0 || !activePipelineId}
            >
              {isGeneratingReport ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {isReportDirty && reportOutput ? "Regenerate" : "Generate Report"}
              </span>
            </Button>
            {currentView === "report" && reportOutput && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 font-bold"
                onClick={() => onExportPDF?.()}
                disabled={isExportingPDF}
              >
                <FileDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export PDF</span>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
