import type { PollingPolicy, WebhookWaitPolicy } from "@/types";

export const DEFAULT_POLLING_POLICY: PollingPolicy = {
  enabled: false,
  intervalMs: 2000,
  maxAttempts: 15,
  timeoutMs: 30000,
  successRules: [
    {
      id: crypto.randomUUID(),
      target: "status_code",
      operator: "equals",
      value: "200",
    },
  ],
  failureRules: [],
};

export const DEFAULT_WEBHOOK_POLICY: WebhookWaitPolicy = {
  enabled: false,
  timeoutMs: 60000,
  pollIntervalMs: 2000,
  correlationKeyTemplate: "",
  correlationSource: "body",
  correlationField: "id",
  signatureSecret: "",
};

export function toPositiveNumber(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
