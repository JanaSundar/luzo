"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { analyzeCollectionToDraft } from "@/features/collection-to-pipeline/analyze";
import { compileDraftToPipeline } from "@/features/collection-to-pipeline/compile";
import {
  ignoreDraftDependency,
  moveDraftStep,
  removeDraftStep,
  renameDraftStep,
  setDraftGrouping,
} from "@/features/collection-to-pipeline/draft-edits";
import { loadCollectionGenerationSource } from "@/features/collection-to-pipeline/normalize-source";
import { useCollectionsQuery } from "@/features/collections/useCollections";
import { usePipelineStore } from "@/stores/usePipelineStore";
import type { PipelineGenerationDraft, PreviewGrouping } from "@/types";

export function usePipelineGenerationFlow(requestedCollectionId?: string | null) {
  const { data: collections = [] } = useCollectionsQuery();
  const activePipeline = usePipelineStore(
    (state) => state.pipelines.find((pipeline) => pipeline.id === state.activePipelineId) ?? null,
  );
  const insertPipeline = usePipelineStore((state) => state.insertPipeline);
  const setView = usePipelineStore((state) => state.setView);
  const updatePipeline = usePipelineStore((state) => state.updatePipeline);
  const [draft, setDraft] = useState<PipelineGenerationDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOpen, setIsOpen] = useState(Boolean(requestedCollectionId));
  const [name, setName] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState(requestedCollectionId ?? "");
  const selectedCollection = useMemo(
    () => collections.find((collection) => collection.id === selectedCollectionId) ?? null,
    [collections, selectedCollectionId],
  );

  const close = useCallback(() => {
    setDraft(null);
    setError(null);
    setIsOpen(false);
    setName("");
  }, []);

  const open = useCallback((collectionId?: string) => {
    setSelectedCollectionId(collectionId ?? "");
    setIsOpen(true);
  }, []);

  const analyzeCollection = useCallback(
    async (collectionId?: string) => {
      const collection = collections.find(
        (entry) => entry.id === (collectionId ?? selectedCollectionId),
      );
      if (!collection) return;
      setIsAnalyzing(true);
      setError(null);
      try {
        const nextDraft = analyzeCollectionToDraft(
          loadCollectionGenerationSource({ collection, sourceType: "stored_collection" }),
        );
        setDraft(nextDraft);
        setName(`${collection.name} Pipeline`);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to analyze collection.");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [collections, selectedCollectionId],
  );

  const analyzeUpload = useCallback((text: string, fileName?: string) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const nextDraft = analyzeCollectionToDraft(tryLoadUploadedSource(text, fileName));
      setDraft(nextDraft);
      setName(`${nextDraft.source.collectionName} Pipeline`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to analyze uploaded JSON.");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const createPipeline = useCallback(() => {
    if (!draft) return;
    const pipeline = compileDraftToPipeline(draft, name);
    if (
      activePipeline &&
      activePipeline.steps.length === 0 &&
      !activePipeline.description?.trim()
    ) {
      updatePipeline(activePipeline.id, {
        description: pipeline.description,
        generationMetadata: pipeline.generationMetadata,
        name: pipeline.name,
        narrativeConfig: pipeline.narrativeConfig,
        steps: pipeline.steps,
      });
    } else {
      insertPipeline(pipeline);
    }
    setView("builder");
    toast.success("Pipeline created from collection");
    close();
  }, [activePipeline, close, draft, insertPipeline, name, setView, updatePipeline]);

  return {
    analyzeCollection,
    analyzeUpload,
    close,
    createPipeline,
    draft,
    error,
    isAnalyzing,
    isOpen,
    name,
    open,
    selectedCollection,
    selectedCollectionId,
    setDraft,
    setDraftGrouping: (stepId: string, grouping: PreviewGrouping) =>
      setDraft((current) => (current ? setDraftGrouping(current, stepId, grouping) : current)),
    setName,
    setSelectedCollectionId,
    setStepName: (stepId: string, value: string) =>
      setDraft((current) => (current ? renameDraftStep(current, stepId, value) : current)),
    ignoreDependency: (dependencyId: string) =>
      setDraft((current) => (current ? ignoreDraftDependency(current, dependencyId) : current)),
    moveStep: (stepId: string, direction: "up" | "down") =>
      setDraft((current) => (current ? moveDraftStep(current, stepId, direction) : current)),
    removeStep: (stepId: string) =>
      setDraft((current) => (current ? removeDraftStep(current, stepId) : current)),
    setIsOpen,
  };
}

function tryLoadUploadedSource(text: string, fileName?: string) {
  try {
    return loadCollectionGenerationSource({ fileName, sourceType: "postman_json", text });
  } catch {
    return loadCollectionGenerationSource({ fileName, sourceType: "luzo_json", text });
  }
}
