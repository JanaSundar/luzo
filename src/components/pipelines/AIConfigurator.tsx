"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PROMPTS } from "@/lib/pipeline/ai-constants";
import { buildReducedContext } from "@/lib/pipeline/context-reducer";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { usePipelineRuntimeStore } from "@/lib/stores/usePipelineRuntimeStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import type { NarrativeTone } from "@/types";
import { PromptEditor } from "./ai-configurator/PromptEditor";
import { SignalSelection } from "./ai-configurator/SignalSelection";
import { ToneSelection } from "./ai-configurator/ToneSelection";

export function AIConfigurator() {
  const { pipelines, activePipelineId, updatePipeline } = usePipelineStore();
  const { signalGroups, selectedSignals, setReportConfig, estimatedTokens, setEstimatedTokens } =
    usePipelineDebugStore();
  const snapshots = usePipelineRuntimeStore((state) => state.snapshots);

  const pipeline = pipelines.find((p) => p.id === activePipelineId);
  const [searchQuery, setSearchQuery] = useState("");

  const narrativeConfig = pipeline?.narrativeConfig ?? {
    tone: "technical" as NarrativeTone,
    prompt: DEFAULT_PROMPTS.technical,
    promptOverrides: { technical: DEFAULT_PROMPTS.technical },
    enabled: true,
  };
  const currentPrompt =
    narrativeConfig.promptOverrides?.[narrativeConfig.tone] ??
    narrativeConfig.prompt ??
    DEFAULT_PROMPTS[narrativeConfig.tone];

  const handleUpdate = useCallback(
    (partial: Partial<typeof narrativeConfig>) => {
      if (!pipeline) return;
      updatePipeline(pipeline.id, {
        narrativeConfig: { ...narrativeConfig, ...partial },
      });
    },
    [pipeline, narrativeConfig, updatePipeline]
  );

  const handleToneChange = useCallback(
    (tone: NarrativeTone) => {
      const newPrompt =
        narrativeConfig.promptOverrides?.[tone] ??
        (tone === narrativeConfig.tone ? currentPrompt : DEFAULT_PROMPTS[tone]);

      handleUpdate({ tone, prompt: newPrompt });
      setReportConfig({ tone, prompt: newPrompt });
    },
    [currentPrompt, handleUpdate, narrativeConfig, setReportConfig]
  );

  const handlePromptChange = useCallback(
    (value: string) => {
      handleUpdate({
        prompt: value,
        promptOverrides: { ...narrativeConfig.promptOverrides, [narrativeConfig.tone]: value },
      });
      setReportConfig({ prompt: value });
    },
    [handleUpdate, narrativeConfig.promptOverrides, narrativeConfig.tone, setReportConfig]
  );

  // Estimate tokens when signals change (use maskSensitive so estimate matches AI payload)
  useEffect(() => {
    if (snapshots.length > 0 && signalGroups.length > 0) {
      const reduced = buildReducedContext(signalGroups, selectedSignals, snapshots, {
        maskSensitive: true,
      });
      setEstimatedTokens(reduced.estimatedTokens);
    }
  }, [selectedSignals, snapshots, signalGroups, setEstimatedTokens]);

  const selectedCount = selectedSignals.length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">AI Report Configurator</h2>
        <p className="text-muted-foreground text-sm">
          Select signals from your pipeline execution, choose a tone, and customize the prompt. AI
          reports are generated only when you explicitly trigger them.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Tone + Prompt */}
        <div className="lg:col-span-2 space-y-8">
          <ToneSelection currentTone={narrativeConfig.tone} onToneChange={handleToneChange} />

          <PromptEditor
            prompt={currentPrompt}
            onChange={handlePromptChange}
            onRevert={() => {
              const prompt = DEFAULT_PROMPTS[narrativeConfig.tone];
              handleUpdate({
                prompt,
                promptOverrides: {
                  ...narrativeConfig.promptOverrides,
                  [narrativeConfig.tone]: prompt,
                },
              });
              setReportConfig({ prompt });
            }}
            onClear={() => {
              handleUpdate({
                prompt: "",
                promptOverrides: { ...narrativeConfig.promptOverrides, [narrativeConfig.tone]: "" },
              });
              setReportConfig({ prompt: "" });
            }}
            selectedCount={selectedCount}
            estimatedTokens={estimatedTokens}
          />
        </div>

        {/* Right Column: Signal Selection */}
        <div className="lg:col-span-1 space-y-4">
          <SignalSelection searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        </div>
      </div>
    </div>
  );
}
