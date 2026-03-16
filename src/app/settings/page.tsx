"use client";

import { Eye, EyeOff, Save } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/use-toast";
import { PROVIDER_CONFIGS } from "@/config/ai-providers";
import { useAvailableModels } from "@/lib/hooks/useAvailableModels";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import type { AiProvider } from "@/types";

const PROVIDERS: AiProvider[] = ["openrouter", "groq", "openai"];

function ApiKeyField({ provider }: { provider: AiProvider }) {
  const { apiKeys, setApiKey } = useSettingsStore();
  const [visible, setVisible] = useState(false);
  const value = apiKeys[provider];

  return (
    <div className="flex gap-2">
      <Input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => setApiKey(provider, e.target.value)}
        placeholder={`Enter ${PROVIDER_CONFIGS[provider].name} API key`}
        className="font-mono text-sm"
      />
      <Button variant="ghost" size="icon" onClick={() => setVisible((v) => !v)}>
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const { aiConfig, apiKeys, setAiConfig } = useSettingsStore();
  const [hasAutoSelectedModel, setHasAutoSelectedModel] = useState(false);
  const activeApiKey = apiKeys[aiConfig.provider];
  const { data: models = [], isLoading: modelsAreLoading } = useAvailableModels(
    aiConfig.provider,
    activeApiKey
  );

  const activeModels = useMemo(
    () =>
      models.length > 0
        ? models
        : PROVIDER_CONFIGS[aiConfig.provider].models.map((model) => ({
            id: model.id,
            name: model.name,
            contextWindow: model.contextWindow,
          })),
    [aiConfig.provider, models]
  );

  useEffect(() => {
    if (!activeModels.length) return;

    const currentModelExists = activeModels.some((model) => model.id === aiConfig.model);
    if (!currentModelExists) {
      setAiConfig({ model: activeModels[0].id });
    }
  }, [activeModels, aiConfig.model, setAiConfig]);

  useEffect(() => {
    setHasAutoSelectedModel(false);
  }, []);

  const save = () => {
    toast("Settings saved");
  };

  return (
    <motion.div
      className="flex-1 overflow-auto p-6 max-w-2xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>AI Model Configuration</CardTitle>
          <CardDescription>
            Configure the AI model used for chat and assistance features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select
              value={aiConfig.provider}
              onValueChange={(v) => {
                const provider = v as AiProvider;
                setAiConfig({
                  provider,
                  model: PROVIDER_CONFIGS[provider].defaultModel,
                });
                setHasAutoSelectedModel(true);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PROVIDER_CONFIGS[p].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Model</Label>
            <Select
              value={aiConfig.model}
              onValueChange={(model) => {
                if (model) setAiConfig({ model });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activeModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {modelsAreLoading
                ? "Loading models from the selected provider..."
                : hasAutoSelectedModel && !activeApiKey
                  ? "Showing the built-in fallback list until you add an API key."
                  : "Available models are loaded from the provider API when possible."}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Temperature: {aiConfig.temperature ?? 0.7}</Label>
            <Slider
              min={0}
              max={2}
              step={0.1}
              defaultValue={aiConfig.temperature ?? 0.7}
              onValueChange={(v: number | readonly number[]) => {
                const val = Array.isArray(v) ? (v as number[])[0] : (v as number);
                setAiConfig({ temperature: val });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Max Tokens: {aiConfig.maxTokens ?? 4096}</Label>
            <Slider
              min={256}
              max={16384}
              step={256}
              defaultValue={aiConfig.maxTokens ?? 4096}
              onValueChange={(v: number | readonly number[]) => {
                const val = Array.isArray(v) ? (v as number[])[0] : (v as number);
                setAiConfig({ maxTokens: val });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Add your provider API keys. Keys stay in local browser storage and are also used to
            fetch the latest model list from each provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PROVIDERS.map((provider) => (
            <div key={provider} className="space-y-1.5">
              <Label>{PROVIDER_CONFIGS[provider].name}</Label>
              <ApiKeyField provider={provider} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <Button onClick={save} className="gap-2">
        <Save className="h-4 w-4" />
        Save Settings
      </Button>
    </motion.div>
  );
}
