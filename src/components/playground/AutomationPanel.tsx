import { History, Loader2, Play, Settings2, Square, Trash2, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { generateAiTestPlan } from "@/app/actions/ai-qa";
import { executeRequest } from "@/app/actions/api-tests";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PROVIDER_CONFIGS } from "@/config/ai-providers";
import { isAutomationCapable } from "@/lib/ai/provider-api";
import { useAvailableModels } from "@/lib/hooks/useAvailableModels";
import { useAutomationStore } from "@/lib/stores/useAutomationStore";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import { cn } from "@/lib/utils";
import type { AiProvider, AutomationSequence, HttpMethod } from "@/types";

export function AutomationPanel() {
  const {
    sequences,
    isRecording,
    startRecording,
    stopRecording,
    clearHistory,
    updateStep,
    deleteSequence,
  } = useAutomationStore();
  const { setResponse } = usePlaygroundStore();

  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);

  // Model Selection for AI QA
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>("openrouter");
  const [selectedModel, setSelectedModel] = useState<string>("anthropic/claude-3.5-sonnet");

  const { apiKeys } = useSettingsStore();
  const { data: fetchedModels } = useAvailableModels(
    selectedProvider,
    apiKeys[selectedProvider as keyof typeof apiKeys]
  );

  const automationModels = useMemo(() => {
    // Start with fallback models for all providers, identified as automation capable
    const fallbacks = Object.values(PROVIDER_CONFIGS).flatMap((p) =>
      p.models
        .filter((m) => isAutomationCapable(m.id))
        .map((m) => ({
          ...m,
          provider: p.id,
          providerName: p.name,
          capabilities: ["automation"],
        }))
    );

    // Merge with fetched models that have the capability (assigned by API)
    const dynamic = (fetchedModels ?? [])
      .filter((m) => m.capabilities?.includes("automation"))
      .map((m) => ({
        id: m.id,
        name: m.name,
        contextWindow: m.contextWindow ?? 128000,
        provider: selectedProvider,
        providerName: PROVIDER_CONFIGS[selectedProvider as keyof typeof PROVIDER_CONFIGS].name,
        capabilities: ["automation"] as string[],
      }));

    // deduplicate by ID, prioritizing dynamic data
    const allModels = [...dynamic];
    for (const m of fallbacks) {
      if (!allModels.find((x) => x.id === m.id)) {
        allModels.push(m);
      }
    }

    return allModels;
  }, [fetchedModels, selectedProvider]);

  const handleGenerateTests = async (sequence: AutomationSequence) => {
    if (sequence.steps.length === 0) return;
    setIsGenerating(sequence.id);

    try {
      const plan = await generateAiTestPlan(sequence.steps, {
        provider: selectedProvider,
        model: selectedModel,
      });

      // Update steps with new test scripts
      for (const step of plan) {
        updateStep(step.stepId, { testScript: step.testScript });
      }

      toast.success(`Generated tests for ${plan.length} steps`);
    } catch (error: unknown) {
      console.error(error);
      toast.error("Failed to generate AI tests");
    } finally {
      setIsGenerating(null);
    }
  };

  const handleRunSequence = async (sequence: AutomationSequence) => {
    setIsRunning(sequence.id);
    setActiveStepIndex(0);

    try {
      for (let i = 0; i < sequence.steps.length; i++) {
        setActiveStepIndex(i);
        const step = sequence.steps[i];

        // Execute request
        const res = await executeRequest({
          method: step.method as HttpMethod,
          url: step.url,
          headers: step.headers,
          params: step.params,
          body: step.body,
          bodyType: step.bodyType,
          auth: { type: "none" }, // For now, simple auth. Sequence execution could be enhanced.
        });

        // Reflect in playground if it's the last step or for feedback
        setResponse(res);

        // Short delay for visual feedback
        await new Promise((r) => setTimeout(r, 500));
      }
      toast.success("Sequence completed successfully");
    } catch (error: unknown) {
      console.error(error);
      toast.error("Sequence execution failed");
    } finally {
      setIsRunning(null);
      setActiveStepIndex(-1);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-[400px] border-l bg-background/50 backdrop-blur-xl overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between bg-muted/5">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary animate-pulse" />
          <h2 className="text-sm font-bold uppercase tracking-widest opacity-80">AI QA Pipeline</h2>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
              Provider Engine
            </div>
            <Select
              value={selectedProvider}
              onValueChange={(val) => {
                if (val) {
                  setSelectedProvider(val);
                  const config = PROVIDER_CONFIGS[val as keyof typeof PROVIDER_CONFIGS];
                  setSelectedModel(config.defaultModel);
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs glass border-border/40">
                <SelectValue placeholder="Select Provider" />
              </SelectTrigger>
              <SelectContent className="glass">
                {Object.values(PROVIDER_CONFIGS).map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
              <Settings2 className="h-3 w-3" />
              Model Intelligence
            </div>
            <Select
              value={selectedModel}
              onValueChange={(val: string | null) => {
                if (val) {
                  const m = automationModels.find((m) => m.id === val);
                  if (m) {
                    setSelectedModel(val);
                  }
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs glass border-border/40">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent className="glass">
                {automationModels
                  .filter((m) => m.provider === selectedProvider || m.id === selectedModel)
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-semibold">{m.name}</span>
                        <span className="text-[9px] opacity-50 uppercase tracking-tighter">
                          {m.providerName}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              className="flex-1 gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
              variant="outline"
              size="sm"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Start Recording
            </Button>
          ) : (
            <Button
              onClick={() => stopRecording("")}
              variant="destructive"
              className="flex-1 gap-2 animate-pulse"
              size="sm"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop Recording
            </Button>
          )}
        </div>
      </div>

      <Separator className="opacity-40" />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 opacity-60">
            <History className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Sequences</span>
          </div>
          {sequences.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={clearHistory}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="px-4 pb-4 space-y-3">
            {sequences.length === 0 ? (
              <div className="py-12 text-center space-y-3 flex flex-col items-center justify-center opacity-40">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Wand2 className="h-5 w-5" />
                </div>
                <p className="text-[11px] font-medium italic">No active sequences recorded</p>
              </div>
            ) : (
              sequences.map((seq) => (
                <div
                  key={seq.id}
                  className={cn(
                    "p-4 rounded-2xl border glass transition-all group relative overflow-hidden",
                    isRunning === seq.id ? "ring-2 ring-primary/50" : "hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-3 min-w-0">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-bold truncate pr-8">{seq.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono opacity-60">
                        {seq.steps.length} ops • {new Date(seq.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteSequence(seq.id)}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 h-8 text-[10px] uppercase font-bold tracking-widest gap-2 bg-muted/40"
                        onClick={() => handleGenerateTests(seq)}
                        disabled={!!isGenerating || !!isRunning}
                      >
                        {isGenerating === seq.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="h-3 w-3" />
                        )}
                        {isGenerating === seq.id ? "Thinking..." : "AI Generate"}
                      </Button>

                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 h-8 text-[10px] uppercase font-bold tracking-widest gap-2"
                        onClick={() => handleRunSequence(seq)}
                        disabled={!!isGenerating || !!isRunning}
                      >
                        {isRunning === seq.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3 fill-current" />
                        )}
                        {isRunning === seq.id ? "Running..." : "Run Flow"}
                      </Button>
                    </div>

                    {/* Step Visualizer during Run */}
                    {isRunning === seq.id && (
                      <div className="mt-3 flex gap-1 justify-center">
                        {seq.steps.map((step, idx) => (
                          <div
                            key={step.id}
                            className={cn(
                              "h-1.5 w-4 rounded-full transition-all duration-300",
                              idx === activeStepIndex
                                ? "bg-primary w-8"
                                : idx < activeStepIndex
                                  ? "bg-primary/40"
                                  : "bg-muted-foreground/20"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
