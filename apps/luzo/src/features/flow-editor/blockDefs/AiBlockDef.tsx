"use client";

import type { AINode, BlockDefinition } from "@luzo/flow-types";

import { MODEL_REGISTRY } from "@/config/model-registry";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildStepAliases } from "@/lib/pipeline/dag-validator";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import type { Pipeline } from "@/types";

export function createAiBlockDef(pipeline: Pipeline | null): BlockDefinition {
  return {
    type: "ai",
    minWidth: 316,
    handles: [
      { id: "input", position: "left", type: "target" },
      { id: "output", position: "right", type: "source", label: "Output" },
    ],
    renderCard: (node) => <AiCard node={node as AINode} pipeline={pipeline} />,
    renderInspector: (node, api) => (
      <AiInspector api={api} node={node as AINode} pipeline={pipeline} />
    ),
  };
}

function AiCard({ node, pipeline }: { node: AINode; pipeline: Pipeline | null }) {
  const provider = node.data.provider ?? "openrouter";
  const providerName = MODEL_REGISTRY[provider].name;
  const modelId = node.data.model ?? MODEL_REGISTRY[provider].defaultModel;
  const model =
    MODEL_REGISTRY[provider].models.find((entry) => entry.id === modelId)?.label ?? modelId;
  const alias = getNodeAlias(node.id, pipeline);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            AI Node
          </div>
          <div className="truncate text-sm font-semibold text-foreground">
            {node.data.label?.trim() || "AI response generator"}
          </div>
        </div>
        <Badge
          variant="outline"
          className="max-w-[8.5rem] shrink rounded-full px-2 py-1 text-[10px] uppercase"
          title={providerName}
        >
          {providerName}
        </Badge>
      </div>

      <div className="grid gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <div className="flex min-w-0 flex-wrap gap-2">
          <span
            className="max-w-full truncate rounded-full border border-border/50 bg-muted/40 px-2 py-1"
            title={model}
          >
            {model}
          </span>
          <span className="rounded-full border border-border/50 bg-muted/20 px-2 py-1">
            Output text ready
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        <div className="line-clamp-4 whitespace-pre-wrap break-words">
          {node.data.prompt?.trim() || "Add a prompt to produce reusable AI output."}
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Downstream variable
        </div>
        <div className="mt-1 break-all font-mono text-xs text-foreground">
          {alias ? `{{${alias}.response.outputText}}` : "Run once to reference this output"}
        </div>
      </div>
    </div>
  );
}

function AiInspector({
  api,
  node,
  pipeline,
}: {
  api: { onUpdate: (nodeId: string, patch: Record<string, unknown>) => void };
  node: AINode;
  pipeline: Pipeline | null;
}) {
  const configuredProviders = useSettingsStore((state) => state.providers);
  const provider = node.data.provider ?? "openrouter";
  const providerRegistry = MODEL_REGISTRY[provider];
  const providerStatus =
    configuredProviders[provider]?.apiKey?.trim().length > 0
      ? "Configured in Settings"
      : "API key missing in Settings";
  const outputAlias = getNodeAlias(node.id, pipeline);
  const outputReference = outputAlias
    ? `{{${outputAlias}.response.outputText}}`
    : "Run once to generate a stable alias";

  return (
    <section className="grid min-w-0 gap-4 rounded-[1.25rem] border border-border/45 bg-background px-4 py-4 shadow-sm">
      <div className="grid gap-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          AI Block
        </div>
        <div className="text-sm text-muted-foreground">
          Configure provider, model, and prompt here. API keys are pulled from Settings at runtime.
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${node.id}-ai-label`}>Label</Label>
        <Input
          id={`${node.id}-ai-label`}
          aria-label="AI label"
          value={node.data.label ?? ""}
          onChange={(event) => api.onUpdate(node.id, { label: event.target.value })}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid min-w-0 gap-2">
          <Label htmlFor={`${node.id}-ai-provider`}>Provider</Label>
          <Select
            value={provider}
            onValueChange={(nextProvider) => {
              if (!nextProvider) return;
              api.onUpdate(node.id, {
                model: MODEL_REGISTRY[nextProvider].defaultModel,
                provider: nextProvider,
              });
            }}
          >
            <SelectTrigger
              id={`${node.id}-ai-provider`}
              aria-label="AI provider"
              className="w-full min-w-0"
            >
              <SelectValue className="min-w-0 truncate" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(MODEL_REGISTRY).map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{providerStatus}</p>
        </div>

        <div className="grid min-w-0 gap-2">
          <Label htmlFor={`${node.id}-ai-model`}>Model</Label>
          <Select
            value={node.data.model ?? providerRegistry.defaultModel}
            onValueChange={(model) => api.onUpdate(node.id, { model })}
          >
            <SelectTrigger
              id={`${node.id}-ai-model`}
              aria-label="AI model"
              className="w-full min-w-0"
            >
              <SelectValue className="min-w-0 truncate" />
            </SelectTrigger>
            <SelectContent className="max-w-[min(26rem,calc(100vw-2rem))]">
              {providerRegistry.models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${node.id}-ai-system-prompt`}>System prompt</Label>
        <Textarea
          id={`${node.id}-ai-system-prompt`}
          aria-label="AI system prompt"
          placeholder="You are a helpful API workflow assistant."
          rows={4}
          value={node.data.systemPrompt ?? ""}
          onChange={(event) => api.onUpdate(node.id, { systemPrompt: event.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${node.id}-ai-prompt`}>Prompt</Label>
        <Textarea
          id={`${node.id}-ai-prompt`}
          aria-label="AI prompt"
          placeholder="Summarize the previous response and return only the token we should use next."
          rows={8}
          value={node.data.prompt ?? ""}
          onChange={(event) => api.onUpdate(node.id, { prompt: event.target.value })}
        />
        <p className="text-xs leading-5 text-muted-foreground">
          You can reference previous step outputs here, for example{" "}
          <span className="font-mono text-foreground">{"{{req1.response.body}}"}</span>.
        </p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-muted/20 px-3 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Output
        </div>
        <div className="mt-2 space-y-2 text-xs text-muted-foreground">
          <p>The full provider response is logged in the debugger response tab.</p>
          <p>
            For downstream requests, use{" "}
            <span className="break-all font-mono text-foreground">{outputReference}</span> to access
            the extracted assistant text directly.
          </p>
        </div>
      </div>
    </section>
  );
}

function getNodeAlias(nodeId: string, pipeline: Pipeline | null) {
  if (!pipeline) return null;
  return buildStepAliases(pipeline.steps).find((alias) => alias.stepId === nodeId)?.alias ?? null;
}
