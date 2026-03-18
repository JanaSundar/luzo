"use client";

import {
  Activity,
  CheckCircle2,
  CircleDot,
  Cpu,
  KeyRound,
  Layers,
  Loader2,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { getRecommendedModel, MODEL_REGISTRY } from "@/config/model-registry";
import { validateApiKey } from "@/lib/settings/api-key-validation";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { cn } from "@/lib/utils";
import type { AiProvider } from "@/types";
import { ModelSelectionTable } from "./ModelSelectionTable";

type ValidationStatus = "idle" | "validating" | "valid" | "invalid";

const PROVIDERS: { id: AiProvider; name: string; icon: React.ElementType }[] = [
  { id: "openrouter", name: "OpenRouter", icon: Layers },
  { id: "openai", name: "OpenAI", icon: CircleDot },
  { id: "groq", name: "Groq", icon: Activity },
];

export function AIConfigView() {
  const { aiProvider, setAIProvider } = usePipelineDebugStore();
  const [showKey, setShowKey] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>("idle");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isApiKeyValid = validationStatus === "valid";

  const handleApiKeyChange = useCallback(
    (value: string) => {
      setAIProvider({ apiKey: value });
      setValidationStatus("idle");
      setValidationError(null);
    },
    [setAIProvider]
  );

  const handleValidateKey = useCallback(async () => {
    if (!aiProvider.apiKey || aiProvider.apiKey.length < 5) {
      setValidationError("Please enter a valid API key");
      return;
    }

    setValidationStatus("validating");
    setValidationError(null);

    const result = await validateApiKey(aiProvider.provider, aiProvider.apiKey);

    if (result.valid) {
      setValidationStatus("valid");
      toast.success("API key validated successfully");
    } else {
      setValidationStatus("invalid");
      setValidationError(result.error || "Invalid API key");
      toast.error(result.error || "Invalid API key");
    }
  }, [aiProvider.provider, aiProvider.apiKey]);

  const handleProviderChange = (provider: AiProvider) => {
    const rec = getRecommendedModel(provider);
    setAIProvider({
      provider,
      model: rec?.id ?? MODEL_REGISTRY[provider].defaultModel,
      customBaseUrl: undefined,
      customModel: undefined,
    });
    setValidationStatus("idle");
    setValidationError(null);
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    try {
      if (aiProvider.apiKey && !isApiKeyValid) {
        const result = await validateApiKey(aiProvider.provider, aiProvider.apiKey);
        if (!result.valid) {
          setValidationStatus("invalid");
          setValidationError(result.error || "Invalid API key");
          toast.error(result.error || "Please validate your API key before saving");
          setIsSaving(false);
          return;
        }
        setValidationStatus("valid");
      }

      toast.success("Configuration saved successfully");
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  }, [aiProvider, isApiKeyValid]);

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 px-1">
          Select Provider
        </label>
        <div className="flex items-center">
          <nav className="flex items-center gap-0.5 rounded-full bg-muted/50 p-0.5 border border-border/50">
            {PROVIDERS.map((p) => {
              const isActive = aiProvider.provider === p.id;
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id)}
                  className={cn(
                    "relative flex h-7 items-center gap-2 px-4 text-[10px] uppercase tracking-wider font-bold transition-all rounded-full outline-none whitespace-nowrap",
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="provider-pill"
                      className="absolute inset-0 bg-primary rounded-full shadow-sm"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "relative z-10 h-3.5 w-3.5",
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                  />
                  <span className="relative z-10">{p.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
            <KeyRound className="h-3 w-3" />
            {PROVIDERS.find((p) => p.id === aiProvider.provider)?.name} API Key
          </label>
          <div className="flex items-center gap-2">
            {validationStatus === "valid" && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="text-[10px] font-bold text-primary hover:underline"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? "text" : "password"}
              value={aiProvider.apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder={`Enter your ${PROVIDERS.find((p) => p.id === aiProvider.provider)?.name} API key...`}
              className="font-mono text-xs h-10 bg-background border-primary/20 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all rounded-xl pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <XCircle className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />}
            </button>
          </div>
          <button
            type="button"
            onClick={handleValidateKey}
            disabled={!aiProvider.apiKey || validationStatus === "validating"}
            className={cn(
              "h-10 px-4 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all outline-none flex items-center gap-2",
              isApiKeyValid
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 cursor-default"
                : "bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            )}
          >
            {validationStatus === "validating" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Validating...</span>
              </>
            ) : isApiKeyValid ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Verified</span>
              </>
            ) : (
              <span>Validate</span>
            )}
          </button>
        </div>
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-destructive bg-destructive/5 px-3 py-2 rounded-lg border border-destructive/10 text-[9px] font-bold"
          >
            <XCircle className="h-3 w-3 shrink-0" />
            {validationError}
          </motion.div>
        )}
        <p className="text-[9px] text-muted-foreground px-1">
          Your API key is stored locally in your browser and never sent to our servers.
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Model Intelligence
            </h3>
          </div>
          {!aiProvider.apiKey ? (
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              API Key Required
            </span>
          ) : validationStatus === "validating" ? (
            <div className="flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Validating...</span>
            </div>
          ) : validationStatus === "invalid" ? (
            <span className="text-[9px] font-black uppercase tracking-widest text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20">
              Invalid Key
            </span>
          ) : (
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              <span>Ready</span>
            </div>
          )}
        </div>

        <div
          className={cn(
            "border rounded-xl transition-all duration-300 overflow-hidden bg-muted/5",
            !aiProvider.apiKey ? "opacity-60 pointer-events-none" : "opacity-100"
          )}
        >
          <ModelSelectionTable />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "h-9 px-6 rounded-full font-black uppercase tracking-widest text-[10px] transition-all outline-none flex items-center gap-2",
            !isSaving
              ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-105 active:scale-95"
              : "bg-muted text-muted-foreground cursor-not-allowed"
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
