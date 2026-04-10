"use client";

import { useState } from "react";
import type { PipelineStep, PollingPolicy, WebhookWaitPolicy } from "@/types";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/utils/ui/segmentedTabs";
import { cn } from "@/utils";
import { DEFAULT_POLLING_POLICY, DEFAULT_WEBHOOK_POLICY } from "./requestAsyncDefaults";
import { PollingPanel, WebhookPanel } from "./RequestAsyncSections";

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
