import type { AiProvider } from "@/types";

interface ValidationResult {
  valid: boolean;
  error?: string;
}

const PROVIDER_API_ENDPOINTS: Record<AiProvider, string> = {
  openai: "https://api.openai.com/v1/models",
  openrouter: "https://openrouter.ai/api/v1/models",
  groq: "https://api.groq.com/openai/v1/models",
};

const VALIDATION_TIMEOUT_MS = 10_000;

export async function validateApiKey(
  provider: AiProvider,
  apiKey: string
): Promise<ValidationResult> {
  const endpoint = PROVIDER_API_ENDPOINTS[provider];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        valid: false,
        error: "Invalid API key. Please check and try again.",
      };
    }

    if (response.status === 429) {
      return {
        valid: false,
        error: "Rate limited. Please wait a moment and try again.",
      };
    }

    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData?.error?.message || errorData?.message || `API error (${response.status})`;

    return { valid: false, error: message };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return {
          valid: false,
          error: "Validation timed out. Please check your connection and try again.",
        };
      }
      return { valid: false, error: err.message };
    }

    return { valid: false, error: "An unexpected error occurred" };
  }
}
