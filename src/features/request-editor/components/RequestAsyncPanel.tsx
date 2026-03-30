"use client";

import { useState } from "react";
import { TestBuilder } from "@/components/playground/TestBuilder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { PipelineStep, PollingPolicy, WebhookWaitPolicy } from "@/types";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/utils/ui/segmentedTabs";
import { cn } from "@/utils";
import {
  DEFAULT_POLLING_POLICY,
  DEFAULT_WEBHOOK_POLICY,
  toPositiveNumber,
} from "./requestAsyncDefaults";

interface RequestAsyncPanelProps {
  pollingPolicy?: PollingPolicy;
  webhookWaitPolicy?: WebhookWaitPolicy;
  onChange: (partial: Partial<PipelineStep>) => void;
}

export function RequestAsyncPanel({
  pollingPolicy,
  webhookWaitPolicy,
  onChange,
}: RequestAsyncPanelProps) {
  const nextPolling = pollingPolicy ?? DEFAULT_POLLING_POLICY;
  const nextWebhook = webhookWaitPolicy ?? DEFAULT_WEBHOOK_POLICY;
  const [activeSection, setActiveSection] = useState<"polling" | "webhook">("polling");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pr-1">
      <div
        role="tablist"
        aria-label="Automation options"
        className={cn(
          "inline-flex w-fit min-w-0 items-center self-start",
          segmentedTabListClassName,
        )}
      >
        {(["polling", "webhook"] as const).map((section) => {
          const active = activeSection === section;
          return (
            <button
              key={section}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveSection(section)}
              className={segmentedTabTriggerClassName(active, "h-8 shrink-0 px-3 text-[11px]")}
            >
              {section === "polling" ? "Polling" : "Webhook"}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {activeSection === "polling" ? (
          <PollingPanel policy={nextPolling} onChange={onChange} />
        ) : (
          <WebhookPanel policy={nextWebhook} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

function PollingPanel({
  policy,
  onChange,
}: {
  policy: PollingPolicy;
  onChange: (partial: Partial<PipelineStep>) => void;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border/40 bg-background/70 p-4">
      <Header
        title="Polling"
        description="Retry this request until it succeeds or times out."
        enabled={policy.enabled}
        onEnabledChange={(enabled) =>
          onChange({
            pollingPolicy: enabled
              ? { ...DEFAULT_POLLING_POLICY, ...policy, enabled }
              : { ...policy, enabled },
          })
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Field
          label="Retry every (ms)"
          value={String(policy.intervalMs)}
          disabled={!policy.enabled}
          onChange={(value) =>
            onChange({ pollingPolicy: { ...policy, intervalMs: toPositiveNumber(value, 2000) } })
          }
        />
        <Field
          label="Max tries"
          value={String(policy.maxAttempts ?? 15)}
          disabled={!policy.enabled}
          onChange={(value) =>
            onChange({ pollingPolicy: { ...policy, maxAttempts: toPositiveNumber(value, 15) } })
          }
        />
        <Field
          label="Give up after (ms)"
          value={String(policy.timeoutMs ?? 30000)}
          disabled={!policy.enabled}
          onChange={(value) =>
            onChange({ pollingPolicy: { ...policy, timeoutMs: toPositiveNumber(value, 30000) } })
          }
        />
      </div>

      <RuleBlock
        label="Success condition"
        rules={policy.successRules}
        onChange={(rules) => onChange({ pollingPolicy: { ...policy, successRules: rules } })}
      />
      <RuleBlock
        label="Failure condition"
        rules={policy.failureRules ?? []}
        onChange={(rules) => onChange({ pollingPolicy: { ...policy, failureRules: rules } })}
      />
    </section>
  );
}

function WebhookPanel({
  policy,
  onChange,
}: {
  policy: WebhookWaitPolicy;
  onChange: (partial: Partial<PipelineStep>) => void;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border/40 bg-background/70 p-4">
      <Header
        title="Webhook"
        description="Wait for a matching callback before continuing."
        enabled={policy.enabled}
        onEnabledChange={(enabled) =>
          onChange({
            webhookWaitPolicy: enabled
              ? { ...DEFAULT_WEBHOOK_POLICY, ...policy, enabled }
              : { ...policy, enabled },
          })
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="Timeout (ms)"
          value={String(policy.timeoutMs)}
          disabled={!policy.enabled}
          onChange={(value) =>
            onChange({
              webhookWaitPolicy: { ...policy, timeoutMs: toPositiveNumber(value, 60000) },
            })
          }
        />
        <Field
          label="Check status every (ms)"
          value={String(policy.pollIntervalMs)}
          disabled={!policy.enabled}
          onChange={(value) =>
            onChange({
              webhookWaitPolicy: { ...policy, pollIntervalMs: toPositiveNumber(value, 2000) },
            })
          }
        />
        <Field
          label="Match value"
          value={policy.correlationKeyTemplate}
          disabled={!policy.enabled}
          onChange={(value) =>
            onChange({ webhookWaitPolicy: { ...policy, correlationKeyTemplate: value } })
          }
        />
        <Field
          label="Match field"
          value={policy.correlationField}
          disabled={!policy.enabled}
          onChange={(value) =>
            onChange({ webhookWaitPolicy: { ...policy, correlationField: value } })
          }
        />
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Correlation source
          </Label>
          <Select
            value={policy.correlationSource}
            onValueChange={(value) =>
              onChange({
                webhookWaitPolicy: {
                  ...policy,
                  correlationSource: value as WebhookWaitPolicy["correlationSource"],
                },
              })
            }
            disabled={!policy.enabled}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="body">Body</SelectItem>
              <SelectItem value="header">Header</SelectItem>
              <SelectItem value="query">Query</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Field
          label="Webhook signing secret"
          value={policy.signatureSecret ?? ""}
          disabled={!policy.enabled}
          onChange={(value) =>
            onChange({ webhookWaitPolicy: { ...policy, signatureSecret: value } })
          }
        />
      </div>
    </section>
  );
}

function Header({
  title,
  description,
  enabled,
  onEnabledChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Switch checked={enabled} onCheckedChange={onEnabledChange} />
    </div>
  );
}

function RuleBlock({
  label,
  rules,
  onChange,
}: {
  label: string;
  rules: PollingPolicy["successRules"];
  onChange: (rules: PollingPolicy["successRules"]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </Label>
      <TestBuilder rules={rules} onChange={onChange} />
    </div>
  );
}

function Field({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </Label>
      <Input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
