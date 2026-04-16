"use client";

import { Combine, Loader2 } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
            <Button
              type="button"
              variant="outline"
              className="h-7 gap-1.5 rounded-full border-border/60 bg-background px-3 text-xs font-semibold tracking-tight text-foreground shadow-sm hover:bg-muted/50"
            >
              <Combine className="h-3.5 w-3.5" />
              From collection
            </Button>
          )
        }
      />
      <DialogContent className="flex max-h-[88dvh] flex-col p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-border/50 px-6 py-5">
          <DialogTitle>Pipeline from Collection</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-5">
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
            <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="mb-4 flex items-center justify-between gap-3">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="max-w-md"
                />
                <p className="shrink-0 text-xs text-muted-foreground">
                  {draft.steps.length} step{draft.steps.length === 1 ? "" : "s"}
                </p>
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
              <CollectionPipelineInspector draft={draft} ignoreDependency={ignoreDependency} />
            </div>
          ) : isAnalyzing ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/50 px-6 py-4">
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
