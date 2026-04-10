"use client";

import { BrainCircuit, CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_PROMPTS } from "@/features/pipeline/ai-constants";
import { buildReducedContext } from "@/features/pipeline/context-reducer";
import { usePipelineDebugStore } from "@/stores/usePipelineDebugStore";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { cn } from "@/utils";
import type { NarrativeTone } from "@/types";
import { LengthSelection } from "./ai-configurator/LengthSelection";
import { PromptEditor } from "./ai-configurator/PromptEditor";
import { SignalSelection } from "./ai-configurator/SignalSelection";
import { ToneSelection } from "./ai-configurator/ToneSelection";

export function AIConfigurator() {
  const { pipelines, activePipelineId, updatePipeline } = usePipelineStore();
  const { signalGroups, selectedSignals, setReportConfig, estimatedTokens, setEstimatedTokens } =
    usePipelineDebugStore();
  const snapshots = usePipelineExecutionStore((state) => state.snapshots);

  const pipeline = pipelines.find((p) => p.id === activePipelineId);
  const [searchQuery, setSearchQuery] = useState("");

  const narrativeConfig = pipeline?.narrativeConfig ?? {
    tone: "technical" as NarrativeTone,
    prompt: DEFAULT_PROMPTS.technical,
    promptOverrides: { technical: DEFAULT_PROMPTS.technical },
    enabled: true,
    length: "medium",
  };

  const currentLength = narrativeConfig.length ?? "medium";
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
    [pipeline, narrativeConfig, updatePipeline],
  );

  const handleToneChange = useCallback(
    (tone: NarrativeTone) => {
      const newPrompt =
        narrativeConfig.promptOverrides?.[tone] ??
        (tone === narrativeConfig.tone ? currentPrompt : DEFAULT_PROMPTS[tone]);

      handleUpdate({ tone, prompt: newPrompt });
      setReportConfig({ tone, prompt: newPrompt });
    },
    [currentPrompt, handleUpdate, narrativeConfig, setReportConfig],
  );

  const handlePromptChange = useCallback(
    (value: string) => {
      handleUpdate({
        prompt: value,
        promptOverrides: { ...narrativeConfig.promptOverrides, [narrativeConfig.tone]: value },
      });
      setReportConfig({ prompt: value });
    },
    [handleUpdate, narrativeConfig.promptOverrides, narrativeConfig.tone, setReportConfig],
  );

  const handleLengthChange = useCallback(
    (length: "short" | "medium" | "long") => {
      handleUpdate({ length });
      setReportConfig({ length });
    },
    [handleUpdate, setReportConfig],
  );

  // Sync length from pipeline narrativeConfig to reportConfig store
  useEffect(() => {
    const pipelineLength = pipeline?.narrativeConfig?.length;
    if (pipelineLength) {
      setReportConfig({ length: pipelineLength });
    } else {
      setReportConfig({ length: "medium" });
    }
  }, [pipeline?.narrativeConfig, setReportConfig]);

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
  const totalSignals = useMemo(
    () => signalGroups.reduce((sum, group) => sum + group.variables.length, 0),
    [signalGroups],
  );
  const promptHealth = useMemo(() => {
    if (!currentPrompt.trim()) return "Add a short prompt";
    if (currentPrompt.length > 220) return "Prompt is getting long";
    if (selectedCount === 0) return "Select context signals";
    if (estimatedTokens > 6000) return "Trim signals or prompt";
    return "Ready to generate";
  }, [currentPrompt, estimatedTokens, selectedCount]);
  const summaryItems = [
    { label: "Tone", value: narrativeConfig.tone },
    { label: "Length", value: currentLength },
    { label: "Signals", value: `${selectedCount}/${totalSignals}` },
    { label: "Input", value: `${estimatedTokens || 0} tokens` },
  ];

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-border/50 bg-background/80 shadow-sm backdrop-blur">
        <div className="border-b border-border/40 px-5 py-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            <BrainCircuit className="h-3.5 w-3.5" />
            AI Configurator
          </div>
          <div className="mt-3 space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">
              Shape the report before generation
            </h2>
            <p className="max-w-2xl text-xs text-muted-foreground">
              Pick the style, add one clear instruction, and keep only useful context.
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
          <div className="grid gap-3 lg:grid-cols-2">
            <ToneSelection currentTone={narrativeConfig.tone} onToneChange={handleToneChange} />
            <LengthSelection currentLength={currentLength} onLengthChange={handleLengthChange} />
          </div>

          <div className="min-h-0 flex-1">
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
                  promptOverrides: {
                    ...narrativeConfig.promptOverrides,
                    [narrativeConfig.tone]: "",
                  },
                });
                setReportConfig({ prompt: "" });
              }}
              selectedCount={selectedCount}
              estimatedTokens={estimatedTokens}
            />
          </div>
        </div>
      </section>

      <aside className="flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-border/50 bg-muted/20 shadow-sm">
        <div className="border-b border-border/40 px-4 py-3">
          <div
            className={cn(
              "rounded-xl border px-3 py-2.5",
              promptHealth === "Ready to generate"
                ? "border-emerald-500/25 bg-emerald-500/10"
                : "border-border/50 bg-background/60",
            )}
          >
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Current Plan
            </div>
            <div className="mt-1 text-xs font-medium">{promptHealth}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border/50 bg-background/60 px-3 py-2.5"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {item.label}
                </div>
                <div className="mt-1 text-sm font-semibold capitalize tabular-nums">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          <SignalSelection searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        </div>
      </aside>
    </div>
  );
}
