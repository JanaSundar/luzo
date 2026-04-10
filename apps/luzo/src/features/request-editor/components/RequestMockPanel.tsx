"use client";

import { AlertCircle, Info, Zap } from "lucide-react";
import React, { useEffect, useState } from "react";
import { JsonBodyEditor } from "@/components/playground/JsonBodyEditor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils";
import type { MockConfig } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

interface RequestMockPanelProps {
  config?: MockConfig;
  onChange: (config: MockConfig) => void;
  suggestions?: VariableSuggestion[];
}

export function RequestMockPanel({
  config = { enabled: false, statusCode: 200, body: "", latencyMs: 0 },
  onChange,
  suggestions = [],
}: RequestMockPanelProps) {
  const [statusCodeText, setStatusCodeText] = useState(String(config.statusCode));
  const [latencyText, setLatencyText] = useState(String(config.latencyMs));

  useEffect(() => {
    setStatusCodeText(String(config.statusCode));
  }, [config.statusCode]);

  useEffect(() => {
    setLatencyText(String(config.latencyMs));
  }, [config.latencyMs]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-background text-primary shadow-sm">
            <Zap className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold tracking-tight text-foreground">Mock Mode</h4>
              <span className="rounded-full border border-border/40 bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Preview only
              </span>
            </div>
            <p className="text-[11px] font-medium leading-relaxed text-muted-foreground/80">
              Simulate API responses without making actual network calls.
            </p>
          </div>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => onChange({ ...config, enabled })}
        />
      </div>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-6 rounded-xl border border-border/40 bg-background p-4 transition-all duration-300",
          !config.enabled && "pointer-events-none opacity-50 grayscale-[0.4]",
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
              Status Code
            </Label>
            <div className="relative">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={statusCodeText}
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, "").slice(0, 3);
                  setStatusCodeText(next);
                }}
                onBlur={() => {
                  const nextStatusCode = normalizeStatusCode(statusCodeText, config.statusCode);
                  setStatusCodeText(String(nextStatusCode));
                  onChange({ ...config, statusCode: nextStatusCode });
                }}
                className="h-9 border-border/40 bg-muted/5 pl-3 pr-8 text-xs font-semibold tabular-nums"
                placeholder="200"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    config.statusCode < 300
                      ? "bg-emerald-500"
                      : config.statusCode < 400
                        ? "bg-blue-500"
                        : "bg-rose-500",
                  )}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80 sm:text-right">
              Latency (ms)
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={latencyText}
              onChange={(e) => setLatencyText(e.target.value.replace(/\D/g, ""))}
              onBlur={() => {
                const nextLatency = normalizeLatency(latencyText);
                setLatencyText(String(nextLatency));
                onChange({ ...config, latencyMs: nextLatency });
              }}
              className="h-9 border-border/40 bg-muted/5 text-xs font-semibold tabular-nums text-right"
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
              Mock Response Body
            </Label>
            <div className="flex items-center gap-1.5 rounded-full bg-muted/20 px-2 py-0.5 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">
              <Info className="h-3 w-3" />
              JSON Supported
            </div>
          </div>
          <JsonBodyEditor
            value={config.body}
            onChange={(val) => onChange({ ...config, body: val })}
            suggestions={suggestions}
            placeholder='{ "message": "This is a mocked response" }'
            className="flex-1"
            mode="json"
          />
        </div>

        {!config.body && config.enabled && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium leading-relaxed">
              Empty body will return an empty string. Consider adding a JSON response for downstream
              steps that depend on this data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function normalizeStatusCode(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(599, Math.max(100, parsed));
}

function normalizeLatency(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}
