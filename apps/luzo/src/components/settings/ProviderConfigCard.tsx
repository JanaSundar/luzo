"use client";

import { Plus } from "lucide-react";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import { cn } from "@/lib/utils";
import type { AiProvider } from "@/types";
import { PROVIDER_ICONS } from "./ProviderIcons";

export const PROVIDER_META: Record<AiProvider, { name: string; initial: string; iconBg: string }> =
  {
    openai: { name: "OpenAI", initial: "O", iconBg: "bg-teal-500/15 text-teal-600" },
    openrouter: {
      name: "OpenRouter",
      initial: "O",
      iconBg: "bg-blue-500/15 text-blue-600",
    },
    groq: { name: "Groq", initial: "G", iconBg: "bg-amber-500/15 text-amber-600" },
  };

interface ProviderConfigCardProps {
  provider: AiProvider;
  onClick: () => void;
}

export function ProviderConfigCard({ provider, onClick }: ProviderConfigCardProps) {
  const { providers } = useSettingsStore();
  const config = providers[provider];
  const meta = PROVIDER_META[provider];
  const Icon = PROVIDER_ICONS[provider];

  const isConfigured = Boolean(config?.apiKey?.length);
  const isError = config?.validationStatus === "invalid";
  const modelLabel = config?.model ? (config.modelLabel ?? config.model) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-3 p-4 rounded-lg border text-left transition-all hover:bg-muted/30",
        "bg-card",
        isError ? "border-destructive/40" : "border-border",
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 p-2 [&>svg]:size-full",
            meta.iconBg,
            isError && "bg-destructive/15 text-destructive",
          )}
        >
          <Icon className="size-full" />
        </div>
        <div
          className={cn(
            "h-2 w-2 rounded-full shrink-0 mt-1",
            isConfigured && !isError
              ? "bg-emerald-500"
              : isError
                ? "bg-destructive"
                : "bg-muted-foreground/30",
          )}
        />
      </div>
      <div>
        <p className="text-sm font-bold tracking-tight">{meta.name}</p>
        <p className={cn("text-xs mt-0.5", isError ? "text-destructive" : "text-muted-foreground")}>
          {isError ? "Auth Failed" : (modelLabel ?? "Not configured")}
        </p>
      </div>
    </button>
  );
}

export function AddProviderCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-all min-h-[120px]"
    >
      <Plus className="h-6 w-6" />
      <span className="text-sm font-medium">Add Provider</span>
    </button>
  );
}
