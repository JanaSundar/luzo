"use client";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { TemplateTextarea } from "@/components/ui/template-textarea";
import type { MockConfig } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { FieldLabel, SectionHeading } from "./shared";

export function createMockConfig(current?: MockConfig): MockConfig {
  return (
    current ?? {
      body: '{\n  "ok": true\n}',
      enabled: false,
      latencyMs: 120,
      statusCode: 200,
    }
  );
}

export function MockEditor({
  config,
  disabled,
  suggestions,
  onChange,
}: {
  config: MockConfig;
  disabled: boolean;
  suggestions: VariableSuggestion[];
  onChange: (config: MockConfig) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <SectionHeading
          title="Mock Response"
          description="Use a synthetic response while shaping the flow."
        />
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Enabled</span>
          <Switch
            checked={config.enabled}
            disabled={disabled}
            onCheckedChange={(checked) => onChange({ ...config, enabled: checked })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricInput
          disabled={disabled}
          id="mock-status-code"
          label="Status Code"
          value={String(config.statusCode)}
          onChange={(value) => onChange({ ...config, statusCode: Number(value) || 0 })}
        />
        <MetricInput
          disabled={disabled}
          id="mock-latency"
          label="Latency (ms)"
          value={String(config.latencyMs)}
          onChange={(value) => onChange({ ...config, latencyMs: Number(value) || 0 })}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="mock-body">Mock Body</FieldLabel>
        <TemplateTextarea
          id="mock-body"
          disabled={disabled}
          suggestions={suggestions}
          textareaClassName="min-h-[220px] rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 font-mono text-sm shadow-none focus-visible:border-foreground/30 focus-visible:bg-transparent"
          value={config.body}
          onChange={(body) => onChange({ ...config, body })}
        />
      </div>
    </div>
  );
}

function MetricInput({
  disabled,
  id,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        className="rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 shadow-none focus-visible:border-foreground/30 focus-visible:bg-transparent"
        disabled={disabled}
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
