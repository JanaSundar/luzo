"use client";

import { DollarSign, Sparkles, Star, Zap } from "lucide-react";
import { motion } from "motion/react";
import {
  COST_LABELS,
  getRecommendedModel,
  MODEL_REGISTRY,
  QUALITY_LABELS,
  SPEED_LABELS,
} from "@/config/model-registry";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { cn } from "@/lib/utils";

export function ModelSelectionTable() {
  const { aiProvider, setAIProvider } = usePipelineDebugStore();

  const currentRegistry = MODEL_REGISTRY[aiProvider.provider];
  const models = currentRegistry.models;
  const recommended = getRecommendedModel(aiProvider.provider);

  return (
    <div className="divide-y divide-border/40">
      {models.map((model) => {
        const selected = aiProvider.model === model.id;
        const isRecommended = recommended?.id === model.id;

        return (
          <button
            key={model.id}
            type="button"
            onClick={() => setAIProvider({ model: model.id, customModel: undefined })}
            className={cn(
              "w-full flex items-center gap-4 p-3.5 text-left transition-all hover:bg-muted/30 group relative",
              selected && "bg-primary/[0.03]"
            )}
          >
            <div
              className={cn(
                "h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
                selected
                  ? "border-primary bg-primary"
                  : "border-muted group-hover:border-muted-foreground/50"
              )}
            >
              {selected && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-tight">{model.label}</span>
                {isRecommended && (
                  <span className="flex items-center gap-1 text-[8px] font-black tracking-widest text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    REC
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-1 opacity-60">
                <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-wider">
                  <Zap className="h-3 w-3" />
                  <span>{SPEED_LABELS[model.speed]}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-wider">
                  <DollarSign className="h-3 w-3" />
                  <span>{COST_LABELS[model.cost]}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-wider">
                  <Sparkles className="h-3 w-3" />
                  <span>{QUALITY_LABELS[model.quality]} Quality</span>
                </div>
              </div>
            </div>

            {selected && (
              <motion.div
                layoutId="selected-row-highlight"
                className="absolute inset-y-0 left-0 w-1 bg-primary"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
