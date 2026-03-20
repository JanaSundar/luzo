/**
 * Client-side API key validation.
 * Calls the dedicated /api/providers/[provider]/validate route which uses AI SDK.
 */

import type { AiProvider } from "@/types";

interface ValidationResult {
  valid: boolean;
  error?: string;
}

export async function validateApiKey(
  provider: AiProvider,
  apiKey: string,
): Promise<ValidationResult> {
  try {
    const res = await fetch(`/api/providers/${provider}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });

    const data = await res.json();

    if (res.ok && data.valid) {
      return { valid: true };
    }

    return {
      valid: false,
      error: data.error ?? "Invalid API key. Please check and try again.",
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
