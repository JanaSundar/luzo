"use client";

import { FolderPlus, GitBranch } from "lucide-react";
import type { ReactNode } from "react";
import { SaveToCollectionDialog } from "@/components/collections/SaveToCollectionDialog";
import { AddToPipelineDialog } from "@/components/playground/request/AddToPipelineDialog";
import { ImportCurlDialog } from "@/components/playground/request/ImportCurlDialog";
import { Button } from "@/components/ui/button";
import type { ApiRequest, Pipeline } from "@/types";

interface RequestBuilderActionsProps {
  isLoading: boolean;
  pipelines: Pipeline[];
  request: ApiRequest;
  response: React.ComponentProps<typeof SaveToCollectionDialog>["response"];
  onCreateAndAdd: (pipelineName: string) => void;
  onAddToPipeline: (pipelineId: string, pipelineName: string) => void;
  onImport: (request: ApiRequest) => void;
  onSend: () => void;
  sendIcon: ReactNode;
}

export function RequestBuilderActions({
  isLoading,
  pipelines,
  request,
  response,
  onCreateAndAdd,
  onAddToPipeline,
  onImport,
  onSend,
  sendIcon,
}: RequestBuilderActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2.5">
      <ImportCurlDialog
        onImport={onImport}
        trigger={
          <ActionButton icon={<span className="font-mono opacity-60">()</span>} label="cURL" />
        }
      />
      <AddToPipelineDialog
        pipelines={pipelines.map((pipeline) => ({ id: pipeline.id, name: pipeline.name }))}
        onAddToPipeline={onAddToPipeline}
        onCreateAndAdd={onCreateAndAdd}
        trigger={
          <ActionButton icon={<GitBranch className="h-3.5 w-3.5 opacity-60" />} label="Pipeline" />
        }
      />
      <SaveToCollectionDialog
        request={request}
        response={response}
        defaultName={`${request.method} ${request.url || "Request"}`}
        trigger={
          <ActionButton icon={<FolderPlus className="h-3.5 w-3.5 opacity-60" />} label="Save" />
        }
      />
      <Button
        type="button"
        onClick={onSend}
        disabled={isLoading || !request.url}
        className="h-9 min-w-[110px] gap-2 rounded-full bg-foreground px-5 text-sm font-bold text-background shadow-md transition-all hover:bg-foreground/90 active:scale-[0.98]"
      >
        {sendIcon}
        {isLoading ? "Sending..." : "Send"}
      </Button>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  ...props
}: React.ComponentProps<typeof Button> & { icon: ReactNode; label: string }) {
  return (
    <Button
      {...props}
      variant="outline"
      size="sm"
      className="h-9 gap-2 rounded-full border-border/40 bg-background/80 px-4 text-xs font-semibold shadow-sm hover:bg-background"
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
}
