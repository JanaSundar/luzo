"use client";

import { Combine, Loader2, Workflow } from "lucide-react";
import type { ReactElement } from "react";
import { useEffect } from "react";
import { CollectionPipelineInspector } from "@/components/pipelines/collection-generator/CollectionPipelineInspector";
import { CollectionPipelineSourcePanel } from "@/components/pipelines/collection-generator/CollectionPipelineSourcePanel";
import { CollectionPipelineStepList } from "@/components/pipelines/collection-generator/CollectionPipelineStepList";
import { usePipelineGenerationFlow } from "@/components/pipelines/collection-generator/usePipelineGenerationFlow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCollectionsQuery } from "@/features/collections/useCollections";

interface CollectionPipelineDialogProps {
  initialCollectionId?: string | null;
  onCloseRequestReset?: () => void;
  trigger?: ReactElement;
}

export function CollectionPipelineDialog({
  initialCollectionId,
  onCloseRequestReset,
  trigger,
}: CollectionPipelineDialogProps) {
  const { data: collections = [] } = useCollectionsQuery();
  const flow = usePipelineGenerationFlow(initialCollectionId);
  const {
    analyzeCollection,
    close,
    createPipeline,
    draft,
    error,
    ignoreDependency,
    isAnalyzing,
    isOpen,
    moveStep,
    open: openDialog,
    removeStep,
    selectedCollectionId,
    setDraftGrouping,
    setIsOpen,
    setName,
    setSelectedCollectionId,
    setStepName,
    name,
    analyzeUpload,
  } = flow;
  const handleClose = () => {
    onCloseRequestReset?.();
    close();
  };
  const handleCreate = () => {
    createPipeline();
    onCloseRequestReset?.();
  };

  useEffect(() => {
    if (
      !initialCollectionId ||
      !collections.some((collection) => collection.id === initialCollectionId)
    )
      return;
    setIsOpen(true);
    void analyzeCollection(initialCollectionId);
  }, [analyzeCollection, collections, initialCollectionId, setIsOpen]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
        else openDialog(initialCollectionId ?? undefined);
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button type="button" variant="outline" className="h-8 gap-2">
              <Combine className="h-3.5 w-3.5" />
              From collection
            </Button>
          )
        }
      />
      <DialogContent className="flex max-h-[88dvh] flex-col sm:max-w-6xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]"
            >
              Smart import
            </Badge>
          </div>
          <DialogTitle>Pipeline from Collection</DialogTitle>
          <DialogDescription>
            Pick a collection, review the inferred flow, then create a runnable pipeline.
          </DialogDescription>
        </DialogHeader>

        <CollectionPipelineSourcePanel
          collections={collections}
          error={error}
          isAnalyzing={isAnalyzing}
          onAnalyzeCollection={analyzeCollection}
          onAnalyzeUpload={analyzeUpload}
          selectedCollectionId={selectedCollectionId}
          setSelectedCollectionId={setSelectedCollectionId}
        />

        {draft ? (
          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[1.6fr_1fr]">
            <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-muted/10 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Workflow className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Draft pipeline</p>
                    <p className="text-xs text-muted-foreground">
                      Rename steps, remove noise, and adjust the flow before saving.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {draft.steps.length} step{draft.steps.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="mb-3">
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <CollectionPipelineStepList
                  draft={draft}
                  moveStep={moveStep}
                  removeStep={removeStep}
                  setGrouping={setDraftGrouping}
                  setStepName={setStepName}
                />
              </div>
            </div>
            <div className="min-h-0 overflow-y-auto pr-1">
              <CollectionPipelineInspector draft={draft} ignoreDependency={ignoreDependency} />
            </div>
          </div>
        ) : isAnalyzing ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate} disabled={!draft || !draft.validation.valid}>
            Create pipeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
