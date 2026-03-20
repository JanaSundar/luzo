"use client";

import { Eye, EyeOff, KeyRound, Loader2, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODEL_REGISTRY } from "@/config/model-registry";
import { validateApiKey } from "@/lib/settings/api-key-validation";
import { fetchProviderModels, type ProviderModel } from "@/lib/settings/fetch-provider-models";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/lib/ui/segmentedTabs";
import { cn } from "@/lib/utils";
import type { AiProvider } from "@/types";
import { PROVIDER_META } from "./ProviderConfigCard";
import { PROVIDER_ICONS } from "./ProviderIcons";

export function ProviderConfigView() {
  const { setAIProvider } = usePipelineDebugStore();
  const {
    providers,
    activeAiProvider: activeProvider,
    setProviderConfig,
    setActiveAiProvider: setActiveProvider,
  } = useSettingsStore();

  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<ProviderModel[] | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const config = providers[activeProvider];
  const meta = PROVIDER_META[activeProvider];
  const registry = MODEL_REGISTRY[activeProvider];

  const models = useMemo<ProviderModel[]>(() => {
    return (
      fetchedModels ??
      registry?.models?.map((m: { id: string; label: string }) => ({
        id: m.id,
        label: m.label,
      })) ??
      []
    );
  }, [fetchedModels, registry]);

  useEffect(() => {
    // Only fetch if we have a realistic API key length to avoid premature triggers
    if (!config?.apiKey || config.apiKey.length < 20) {
      setFetchedModels(null);
      return;
    }
    let cancelled = false;
    setIsLoadingModels(true);
    fetchProviderModels(activeProvider, config.apiKey)
      .then((list) => {
        if (!cancelled) setFetchedModels(list);
      })
      .catch(() => {
        if (!cancelled) setFetchedModels(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingModels(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeProvider, config?.apiKey]);

  const handleApiKeyChange = useCallback(
    (value: string) => {
      setProviderConfig(activeProvider, {
        apiKey: value,
        validationStatus: "idle",
      });
    },
    [activeProvider, setProviderConfig],
  );

  const handleTestConnection = useCallback(async () => {
    if (!config?.apiKey || config.apiKey.length < 5) {
      toast.error("Please enter a valid API key");
      return;
    }

    setIsValidating(true);
    setProviderConfig(activeProvider, { validationStatus: "idle" });

    const result = await validateApiKey(activeProvider, config.apiKey);

    if (result.valid) {
      setProviderConfig(activeProvider, { validationStatus: "valid" });
      toast.success("API key validated successfully");
    } else {
      setProviderConfig(activeProvider, { validationStatus: "invalid" });
      toast.error(result.error || "Invalid API key");
    }
    setIsValidating(false);
  }, [activeProvider, config?.apiKey, setProviderConfig]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    try {
      if (config?.apiKey && config.validationStatus !== "valid") {
        const result = await validateApiKey(activeProvider, config.apiKey);
        if (!result.valid) {
          setProviderConfig(activeProvider, { validationStatus: "invalid" });
          toast.error(result.error || "Please validate your API key before saving");
          setIsSaving(false);
          return;
        }
        setProviderConfig(activeProvider, { validationStatus: "valid" });
      }

      setAIProvider({
        provider: activeProvider,
        model: config?.model ?? registry?.defaultModel ?? "",
        apiKey: config?.apiKey ?? "",
      });

      toast.success("Configuration saved successfully");
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  }, [activeProvider, config, registry, setAIProvider, setProviderConfig]);

  const AI_PROVIDERS: AiProvider[] = ["openai", "openrouter", "groq"];

  return (
    <div className="w-full max-w-3xl space-y-10">
      <div className="space-y-4">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 px-1">
          Select Provider
        </label>
        <nav className={cn("flex w-fit items-stretch", segmentedTabListClassName)}>
          {AI_PROVIDERS.map((p) => {
            const isActive = activeProvider === p;
            const pMeta = PROVIDER_META[p];
            return (
              <button
                key={p}
                type="button"
                onClick={() => setActiveProvider(p)}
                className={segmentedTabTriggerClassName(
                  isActive,
                  "h-7 gap-2 px-4 whitespace-nowrap",
                )}
              >
                {pMeta.name}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-lg border border-border/60 flex items-center justify-center shrink-0 bg-background p-2.5 [&>svg]:size-full [&>svg]:text-foreground">
          {(() => {
            const Icon = PROVIDER_ICONS[activeProvider];
            return <Icon />;
          })()}
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Configure {meta.name}</h2>
          <p className="text-sm text-muted-foreground">
            Manage API credentials and default models.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 px-1">
          API KEY
        </label>
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type={showKey ? "text" : "password"}
              value={config?.apiKey ?? ""}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder={`Enter your ${meta.name} API key...`}
              className="font-mono text-xs h-10 pl-10 pr-10 bg-background border border-input focus:border-input focus:ring-1 focus:ring-input/20 transition-all rounded-lg"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Stored locally in your secure keychain. Never transmitted to our servers.
        </p>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 px-1">
          DEFAULT MODEL
        </label>
        <Select
          value={config?.model ?? ""}
          onValueChange={(v) => {
            const selected = models.find((m) => m.id === v);
            setProviderConfig(activeProvider, {
              model: v ?? "",
              modelLabel: selected?.label,
            });
          }}
          disabled={!config?.apiKey || isLoadingModels}
        >
          <SelectTrigger className="w-full h-10 font-mono text-xs rounded-lg">
            <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select model"} />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-t border-border/50 pt-7 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={!config?.apiKey || isValidating}
          className="h-9 px-4 rounded-lg font-bold uppercase tracking-wider text-[10px] border border-input bg-background hover:bg-muted/30 transition-colors flex items-center gap-2 disabled:opacity-65 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground"
        >
          {isValidating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          Test Connection
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "h-9 px-6 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all outline-none flex items-center gap-2",
            !isSaving
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Configuration</span>
          )}
        </button>
      </div>
    </div>
  );
}
