import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { importCurlToRequest } from "@/utils/curl-import";
import type { AiProvider, ApiRequest, PipelineGenerationDraft } from "@/types";
import { createDraftFromRequests } from "./request-draft";
import { createPromptGenerationSource } from "./source-metadata";

interface PromptEnvironmentVariable {
  key: string;
  secret?: boolean;
  value?: string;
}

export interface GeneratePipelineDraftInput {
  authHint?: string;
  baseUrl?: string;
  brief: string;
  environmentVariables?: PromptEnvironmentVariable[];
  pipelineName?: string;
  provider?: {
    apiKey: string;
    model: string;
    provider: AiProvider;
  } | null;
  sampleCurl?: string;
}

type AiDraftPayload = {
  name?: string;
  steps?: Array<{
    body?: string | null;
    bodyType?: ApiRequest["bodyType"];
    headers?: Array<{ key: string; value: string }>;
    method?: ApiRequest["method"];
    name?: string;
    url?: string;
  }>;
  warnings?: string[];
};

const DEFAULT_REQUEST: ApiRequest = {
  auth: { type: "none" },
  body: null,
  bodyType: "none",
  formDataFields: [],
  headers: [],
  method: "GET",
  params: [],
  postRequestEditorType: "visual",
  postRequestRules: [],
  preRequestEditorType: "visual",
  preRequestRules: [],
  testEditorType: "visual",
  testRules: [],
  url: "",
};

export async function generatePipelineDraft(
  input: GeneratePipelineDraftInput,
): Promise<PipelineGenerationDraft> {
  const normalized = normalizeInput(input);
  const fallback = buildDeterministicDraft(normalized);

  if (!normalized.provider?.apiKey) {
    return fallback;
  }

  try {
    const result = await generateText({
      model: createProviderModel(normalized.provider),
      system: buildDraftSystemPrompt(),
      prompt: buildDraftUserPrompt(normalized),
      temperature: 0.2,
      maxOutputTokens: 1800,
    });
    const parsed = parseAiPayload(result.text);
    if (!parsed?.steps?.length) return fallback;

    const aiRequests: ApiRequest[] = [];
    for (const step of parsed.steps.slice(0, 6)) {
      const request = toRequestStep(step, normalized.baseUrl);
      if (request) {
        aiRequests.push(request);
      }
    }

    if (aiRequests.length === 0) return fallback;

    return createDraftFromRequests({
      explanations: [
        "Draft generated from your workflow description.",
        "Review URLs, credentials, and variable paths before creating the pipeline.",
      ],
      requests: aiRequests,
      source: createPromptGenerationSource(
        parsed.name || normalized.pipelineName || summarizePrompt(normalized.brief),
        summarizePrompt(normalized.brief),
        aiRequests.length,
      ),
      warnings: mergeWarnings(normalized.brief, parsed.warnings ?? []),
    });
  } catch {
    return fallback;
  }
}

function buildDeterministicDraft(
  input: Required<Pick<GeneratePipelineDraftInput, "brief">> &
    Omit<GeneratePipelineDraftInput, "brief">,
) {
  const requests: ApiRequest[] = [];
  const warnings = mergeWarnings(input.brief, []);
  const explanations: string[] = [
    "This starter draft was assembled locally so you can review it immediately.",
  ];

  if (input.sampleCurl?.trim()) {
    try {
      requests.push(importCurlToRequest(input.sampleCurl));
      explanations.push("Used the pasted cURL command as the first starter request.");
    } catch {
      warnings.push(
        "The pasted cURL command could not be parsed, so a generic starter flow was used.",
      );
    }
  }

  const mentionsAuth = /\b(auth|authenticate|login|token|bearer|oauth)\b/i.test(input.brief);
  const baseUrl = input.baseUrl || "https://api.example.com";

  if (requests.length === 0 && mentionsAuth) {
    requests.push({
      ...DEFAULT_REQUEST,
      body: JSON.stringify(
        {
          client_id: resolveEnvPlaceholder(input.environmentVariables, ["client_id", "clientId"]),
          client_secret: resolveEnvPlaceholder(input.environmentVariables, [
            "client_secret",
            "clientSecret",
          ]),
        },
        null,
        2,
      ),
      bodyType: "json",
      method: "POST",
      url: `${baseUrl}/auth/token`,
    });
    requests.push({
      ...DEFAULT_REQUEST,
      auth: {
        bearer: { token: "{{req1.response.body.access_token}}" },
        type: "bearer",
      },
      method: "GET",
      url: `${baseUrl}${inferResourcePath(input.brief)}`,
    });
    explanations.push(
      "Added an authentication step before the primary request because the brief referenced auth or tokens.",
    );
  }

  if (requests.length === 0) {
    requests.push({
      ...DEFAULT_REQUEST,
      method: inferMethod(input.brief),
      url: `${baseUrl}${inferResourcePath(input.brief)}`,
    });
    explanations.push("Added a single starter request based on the described endpoint goal.");
  }

  return createDraftFromRequests({
    explanations,
    requests,
    source: createPromptGenerationSource(
      input.pipelineName || summarizePrompt(input.brief),
      summarizePrompt(input.brief),
      requests.length,
    ),
    warnings,
  });
}

function buildDraftSystemPrompt() {
  return `You design concise starter API workflow drafts for Luzo.
Only return JSON.
Rules:
- Output 1 to 6 request steps only.
- Do not emit poll, delay, webhook, switch, foreach, transform, or subflow nodes.
- Prefer plain request chains with upstream references like {{req1.response.body.token}}.
- Use the provided base URL when possible.
- If the brief asks for unsupported orchestration, still return request steps and add a warning.`;
}

function buildDraftUserPrompt(input: GeneratePipelineDraftInput) {
  return JSON.stringify(
    {
      authHint: input.authHint,
      baseUrl: input.baseUrl,
      brief: input.brief,
      environmentVariables: (input.environmentVariables ?? []).map((entry) => ({
        key: entry.key,
        secret: entry.secret ?? false,
      })),
      pipelineName: input.pipelineName,
      sampleCurl: input.sampleCurl,
    },
    null,
    2,
  );
}

function createProviderModel(provider: NonNullable<GeneratePipelineDraftInput["provider"]>) {
  switch (provider.provider) {
    case "openai":
      return createOpenAI({ apiKey: provider.apiKey })(provider.model);
    case "groq":
      return createGroq({ apiKey: provider.apiKey })(provider.model);
    case "openrouter":
      return createOpenAI({
        apiKey: provider.apiKey,
        baseURL: "https://openrouter.ai/api/v1",
      })(provider.model);
  }
}

function parseAiPayload(text: string) {
  const trimmed = text.trim();
  const json = trimmed.match(/\{[\s\S]*\}/)?.[0] ?? trimmed;
  return JSON.parse(json) as AiDraftPayload;
}

function toRequestStep(step: NonNullable<AiDraftPayload["steps"]>[number], baseUrl: string) {
  if (!step?.url?.trim()) return null;
  const url = step.url.startsWith("http") ? step.url : `${baseUrl}${withLeadingSlash(step.url)}`;
  return {
    ...DEFAULT_REQUEST,
    body: step.body ?? null,
    bodyType: step.bodyType ?? (step.body ? "json" : "none"),
    headers: (step.headers ?? []).map((header) => ({
      enabled: true as boolean,
      key: header.key,
      value: header.value,
    })),
    method: step.method ?? "GET",
    url,
  } satisfies ApiRequest;
}

function normalizeInput(input: GeneratePipelineDraftInput) {
  return {
    ...input,
    authHint: input.authHint?.trim(),
    baseUrl: sanitizeBaseUrl(input.baseUrl),
    brief: input.brief.trim(),
    pipelineName: input.pipelineName?.trim(),
    sampleCurl: input.sampleCurl?.trim(),
  };
}

function sanitizeBaseUrl(value?: string) {
  if (!value?.trim()) return "";
  return value.trim().replace(/\/+$/, "");
}

function resolveEnvPlaceholder(
  variables: PromptEnvironmentVariable[] | undefined,
  candidates: string[],
) {
  const match = (variables ?? []).find((entry) =>
    candidates.some((candidate) => entry.key.toLowerCase() === candidate.toLowerCase()),
  );
  return match ? `{{${match.key}}}` : "";
}

function inferMethod(brief: string): ApiRequest["method"] {
  if (/\b(create|post|submit)\b/i.test(brief)) return "POST";
  if (/\b(update|patch)\b/i.test(brief)) return "PATCH";
  if (/\b(delete|remove)\b/i.test(brief)) return "DELETE";
  return "GET";
}

function inferResourcePath(brief: string) {
  if (/\b(user|profile|account)\b/i.test(brief)) return "/users/me";
  if (/\b(order|checkout)\b/i.test(brief)) return "/orders";
  if (/\b(report|analytics)\b/i.test(brief)) return "/reports";
  if (/\bstatus|health\b/i.test(brief)) return "/status";
  return "/resource";
}

function mergeWarnings(brief: string, warnings: string[]) {
  const nextWarnings = [...warnings];
  if (/\b(schedule|cron|every hour|daily|weekly|monitor)\b/i.test(brief)) {
    nextWarnings.push(
      "Recurring or scheduled execution was requested, but the starter draft only creates the workflow itself.",
    );
  }
  if (/\b(poll|polling|retry until|wait for|webhook)\b/i.test(brief)) {
    nextWarnings.push(
      "Async orchestration was requested, so the starter draft falls back to request steps you can extend in the builder.",
    );
  }
  return Array.from(new Set(nextWarnings));
}

function summarizePrompt(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 72) || "Starter workflow";
}

function withLeadingSlash(value: string) {
  return value.startsWith("/") ? value : `/${value}`;
}
