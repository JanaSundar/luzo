import type { WebhookWaitPolicy } from "@/types";

export interface WebhookWaitRecord {
  id: string;
  endpointId: string;
  endpointToken: string;
  endpointUrl: string;
  status: "waiting" | "matched" | "timeout";
  matchedPayload?: unknown;
  matchedEventId?: string | null;
}

export async function createWebhookWait(input: {
  dbUrl: string;
  executionId: string;
  stepId: string;
  correlationKey: string;
  endpointId: string;
  endpointToken: string;
  endpointUrl: string;
  policy: WebhookWaitPolicy;
}) {
  const response = await fetch("/api/webhooks/waits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Failed to create webhook wait");
  }

  return (await response.json()) as { wait: WebhookWaitRecord };
}

export async function readWebhookWait(input: { dbUrl: string; waitId: string }) {
  const response = await fetch("/api/webhooks/waits", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Failed to read webhook wait");
  }

  return (await response.json()) as { wait: WebhookWaitRecord | null };
}
