"use client";

import { useState } from "react";
import {
  Activity,
  BookmarkPlus,
  Bug,
  Database,
  Ellipsis,
  FileDown,
  Loader2,
  Play,
  RefreshCw,
  Share,
  Sparkles,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportPipelineToOpenApi } from "@/features/exporters/pipeline-openapi";
import { exportPipelineToPostman } from "@/features/exporters/pipeline-postman";
import { downloadTextFile, slugifyFilenamePart } from "@/features/reports/export-download";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/utils/ui/segmentedTabs";
import { cn } from "@/utils";
import type { PipelineView } from "@/types";
import type { ExportFormat } from "@/types/pipeline-debug";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { SaveTemplateDialog } from "@/features/templates/components/SaveTemplateDialog";

interface PipelineHeaderProps {
  activePipelineName: string | null;
  currentView: PipelineView;
  isExecuting: boolean;
  activePipelineId: string | null;
  executionBlockedReason?: string | null;
  onSetView: (view: PipelineView) => void;
  onRun: () => void;
  onDebug: () => void;
  onStop: () => void;
  onSaveToDb?: () => void;
  onGenerateReport?: (force?: boolean) => void;
  onExportReport?: (format: ExportFormat) => void;
  canPersistToDb?: boolean;
  isGeneratingReport?: boolean;
  isExportingPDF?: boolean;
  isSavingToDb?: boolean;
  hasGeneratedReport?: boolean;
  hasAIProvider?: boolean;
  autoOpenTimeline?: boolean;
  isExecutionDrawerOpen?: boolean;
  onAutoOpenTimelineChange?: (next: boolean) => void;
  onToggleExecutionDrawer?: () => void;
}

const VIEWS: { id: PipelineView; label: string }[] = [
  { id: "builder", label: "Pipeline Builder" },
  { id: "ai-config", label: "AI Configurator" },
  { id: "report", label: "Report Preview" },
];

const REPORT_EXPORT_FORMATS: Array<{ id: ExportFormat; label: string }> = [
  { id: "pdf", label: "Export PDF" },
  { id: "json", label: "Export JSON" },
  { id: "markdown", label: "Export Markdown" },
];

export function PipelineHeader({
  activePipelineName,
  currentView,
  isExecuting,
  activePipelineId,
  executionBlockedReason = null,
  onSetView,
  onRun,
  onDebug,
  onStop,
  onSaveToDb,
  onGenerateReport,
  onExportReport,
  canPersistToDb = false,
  isGeneratingReport,
  isExportingPDF = false,
  isSavingToDb = false,
  hasGeneratedReport = false,
  hasAIProvider = false,
  autoOpenTimeline = true,
  isExecutionDrawerOpen = false,
  onAutoOpenTimelineChange,
  onToggleExecutionDrawer,
}: PipelineHeaderProps) {
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const { pipelines } = usePipelineStore();
  const pipeline = pipelines.find((p) => p.id === activePipelineId);

  const showExecutionControls = currentView === "builder";
  const showReportControls = currentView === "ai-config" || currentView === "report";
  const canDebugPipeline = !isExecuting && Boolean(activePipelineId) && !executionBlockedReason;
  const canRunPipeline = Boolean(activePipelineId) && !executionBlockedReason;
  const canSaveTemplate = canPersistToDb && Boolean(pipeline);
  const canSavePipeline = Boolean(activePipelineId) && !isSavingToDb;
  const canToggleTimeline = Boolean(activePipelineId);
  const pipelineExportSlug = pipeline ? slugifyFilenamePart(pipeline.name, "pipeline") : null;
  const showOverflowMenu =
    (canPersistToDb && Boolean(onSaveToDb)) ||
    showExecutionControls ||
    (currentView === "report" && hasGeneratedReport);

  const handlePostmanExport = () => {
    if (!pipeline || !pipelineExportSlug) return;
    downloadTextFile(
      exportPipelineToPostman(pipeline),
      `${pipelineExportSlug}.postman_collection.json`,
      "application/json",
    );
  };

  const handleOpenApiExport = () => {
    if (!pipeline || !pipelineExportSlug) return;
    downloadTextFile(
      exportPipelineToOpenApi(pipeline),
      `${pipelineExportSlug}.openapi.json`,
      "application/json",
    );
  };

  return (
    <div className="z-10 flex min-h-14 flex-col justify-between gap-2 border-b bg-background px-3 py-2 sm:flex-row sm:items-center sm:gap-0 sm:px-6 sm:py-0">
      <SaveTemplateDialog
        pipeline={pipeline ?? null}
        open={isSaveTemplateOpen}
        onOpenChange={setIsSaveTemplateOpen}
      />

      <div className="flex min-w-0 items-center gap-2 overflow-x-auto sm:gap-4">
        <h1 className="shrink-0 text-sm font-bold tracking-tight whitespace-nowrap sm:text-lg">
          {activePipelineName || "Select a Pipeline"}
        </h1>
        <nav className={cn("max-w-full shrink-0 overflow-x-auto", segmentedTabListClassName)}>
          {VIEWS.map((v) => (
            <button
              type="button"
              key={v.id}
              onClick={() => onSetView(v.id)}
              className={segmentedTabTriggerClassName(
                currentView === v.id,
                "h-8 shrink-0 whitespace-nowrap px-2.5 text-[10px] sm:px-3.5 sm:text-[11px]",
              )}
            >
              {v.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {showExecutionControls && (
          <>
            {isExecuting ? (
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
            ) : (
              <Button
                type="button"
                size="sm"
                className="gap-1.5 h-8 bg-foreground text-background hover:bg-foreground/90 font-bold"
                onClick={onRun}
                disabled={!canRunPipeline}
                title={executionBlockedReason ?? undefined}
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span className="hidden sm:inline">Run</span>
              </Button>
            )}
          </>
        )}

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
          </>
        )}

        {showOverflowMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8"
                  aria-label="More actions"
                />
              }
            >
              <Ellipsis className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {canPersistToDb && onSaveToDb ? (
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Save</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setIsSaveTemplateOpen(true)}
                    disabled={!canSaveTemplate}
                    className="text-xs font-medium"
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" />
                    Save as Template
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onSaveToDb}
                    disabled={!canSavePipeline}
                    className="text-xs font-medium"
                  >
                    {isSavingToDb ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Database className="h-3.5 w-3.5" />
                    )}
                    Save to DB
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              ) : null}

              {showExecutionControls ? (
                <>
                  {canPersistToDb && onSaveToDb ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Execution</DropdownMenuLabel>
                    <DropdownMenuCheckboxItem
                      checked={autoOpenTimeline}
                      onCheckedChange={(checked) => onAutoOpenTimelineChange?.(checked)}
                      disabled={!canToggleTimeline}
                      className="text-xs font-medium"
                    >
                      Auto-open timeline
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuItem
                      onClick={onToggleExecutionDrawer}
                      disabled={!canToggleTimeline}
                      className="text-xs font-medium"
                    >
                      <Activity className="h-3.5 w-3.5" />
                      {isExecutionDrawerOpen ? "Hide timeline" : "Show timeline"}
                    </DropdownMenuItem>
                    {!isExecuting ? (
                      <DropdownMenuItem
                        onClick={onDebug}
                        disabled={!canDebugPipeline}
                        title={executionBlockedReason ?? undefined}
                        className="text-xs font-medium"
                      >
                        <Bug className="h-3.5 w-3.5" />
                        Debug pipeline
                      </DropdownMenuItem>
                    ) : null}
                    {pipeline ? (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="text-xs font-medium">
                          <Share className="h-3.5 w-3.5" />
                          Export pipeline
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-52">
                          <DropdownMenuItem
                            onClick={handlePostmanExport}
                            className="text-xs font-medium"
                          >
                            Export as Postman Collection
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={handleOpenApiExport}
                            className="text-xs font-medium"
                          >
                            Export as OpenAPI Spec
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    ) : null}
                  </DropdownMenuGroup>
                </>
              ) : null}

              {currentView === "report" && hasGeneratedReport ? (
                <>
                  {(canPersistToDb && onSaveToDb) || showExecutionControls ? (
                    <DropdownMenuSeparator />
                  ) : null}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Export</DropdownMenuLabel>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="text-xs font-medium">
                        <FileDown className="h-3.5 w-3.5" />
                        Export report
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-40">
                        {REPORT_EXPORT_FORMATS.map((format) => (
                          <DropdownMenuItem
                            key={format.id}
                            onClick={() => onExportReport?.(format.id)}
                            disabled={format.id === "pdf" && isExportingPDF}
                            className="text-xs font-medium"
                          >
                            {format.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuGroup>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}
