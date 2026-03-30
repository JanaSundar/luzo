"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { PipelineSideInspector } from "@/components/pipelines/PipelineSideInspector";
import { Button } from "@/components/ui/button";
import { CollectionPipelineDialog } from "@/components/pipelines/collection-generator/CollectionPipelineDialog";
import { TemplateBrowserDialog } from "@/features/templates/components/TemplateBrowserDialog";
import type { Pipeline } from "@/types";
import { SubflowLibraryDialog } from "./SubflowLibraryDialog";

export function PipelineBuilderHeader({
  pipelineId,
  name,
  requestedCollectionId,
  onAddRequest,
  onClearRequestedCollection,
}: {
  pipelineId: string;
  name: string;
  requestedCollectionId?: string | null;
  onAddRequest: () => void;
  onClearRequestedCollection?: () => void;
}) {
  return (
    <div className="flex h-[80px] shrink-0 items-center justify-between border-b border-border/40 bg-background/50 px-8 backdrop-blur-md">
      <div className="min-w-0 flex-1">
        <div className="group/pname flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Pipeline Builder
          </span>
          <h2 className="truncate text-lg font-bold tracking-tight text-foreground">{name}</h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={onAddRequest}
          variant="outline"
          className="h-9 gap-2 rounded-full border-border/60 bg-background px-5 text-sm font-semibold tracking-tight text-foreground shadow-sm hover:bg-muted/50"
        >
          <Plus className="h-4 w-4" />
          Add Request
        </Button>
        <TemplateBrowserDialog
          className="h-9 rounded-full border-border/60 bg-background px-5 text-sm font-semibold tracking-tight text-foreground shadow-sm hover:bg-muted/50"
          trigger={<>Use Template</>}
        />
        <SubflowLibraryDialog pipelineId={pipelineId} />
        <CollectionPipelineDialog
          initialCollectionId={requestedCollectionId}
          onCloseRequestReset={onClearRequestedCollection}
        />
      </div>
    </div>
  );
}

export function PipelineBuilderEmptyState({
  requestedCollectionId,
  onAddRequest,
  onClearRequestedCollection,
}: {
  requestedCollectionId?: string | null;
  onAddRequest: () => void;
  onClearRequestedCollection?: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="mb-14 flex w-full max-w-3xl flex-col gap-4 rounded-[32px] border border-dashed border-border/60 bg-muted/5 p-8 text-center shadow-sm">
        <div className="mx-auto rounded-full bg-background p-4 ring-1 ring-border/50">
          <Plus className="h-6 w-6 opacity-50" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            Start with a template or build from scratch
          </h3>
          <p className="mt-1 text-sm text-muted-foreground/80">
            Use one of Luzo&apos;s built-in templates, start blank, or import a collection.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <TemplateBrowserDialog />
          <Button type="button" onClick={onAddRequest} variant="outline">
            Blank Pipeline
          </Button>
          <CollectionPipelineDialog
            initialCollectionId={requestedCollectionId}
            onCloseRequestReset={onClearRequestedCollection}
          />
        </div>
      </div>
    </div>
  );
}

export function PipelineBuilderInspector({
  pipeline,
  selectedNodeId,
  onClose,
}: {
  pipeline: Pipeline;
  selectedNodeId: string | null;
  onClose: () => void;
}) {
  if (!selectedNodeId) return null;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: "min(600px, 45dvw)", opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 35 }}
      className="relative h-full shrink-0 overflow-hidden"
    >
      <div className="absolute inset-y-0 right-0 w-[500px] xl:w-[600px]">
        <PipelineSideInspector
          pipelineId={pipeline.id}
          stepId={selectedNodeId}
          onClose={onClose}
          className="h-full shadow-2xl"
        />
      </div>
    </motion.div>
  );
}
