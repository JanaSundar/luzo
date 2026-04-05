import type { FlowConnection, FlowDocument, FlowBlock, AIBlock, RequestBlock } from "./types";
import type { AiProvider, PipelineStep } from "@/types";

const AI_PROVIDER_BASE_URLS: Record<AiProvider, string> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
};

export function isExecutableBlock(block: FlowBlock): block is AIBlock | RequestBlock {
  return block.type === "ai" || block.type === "request";
}

export function compileExecutableBlock(
  block: AIBlock | RequestBlock,
  incomingByTarget: Map<string, string[]>,
): PipelineStep {
  if (block.type === "request") {
    return {
      ...block.data,
      id: block.id,
      name: block.data.name || "Untitled request",
      stepType: "request",
      upstreamStepIds: incomingByTarget.get(block.id) ?? [],
    };
  }

  const provider = block.data.provider ?? "openrouter";
  const model = block.data.model ?? defaultModelForProvider(provider);
  const prompt = block.data.prompt?.trim() || "Summarize the previous response.";
  const messages = [
    ...(block.data.systemPrompt?.trim()
      ? [{ role: "system", content: block.data.systemPrompt.trim() }]
      : []),
    { role: "user", content: prompt },
  ];

  return {
    auth: {
      type: "bearer",
      bearer: { token: `{{${getAiProviderEnvKey(provider)}}}` },
    },
    body: JSON.stringify(
      {
        messages,
        model,
      },
      null,
      2,
    ),
    bodyType: "json",
    headers: [
      { enabled: true, key: "Content-Type", value: "application/json" },
      ...(provider === "openrouter"
        ? [
            {
              enabled: true,
              key: "HTTP-Referer",
              value: "https://luzo.local",
            },
            {
              enabled: true,
              key: "X-Title",
              value: "Luzo AI Node",
            },
          ]
        : []),
    ],
    id: block.id,
    method: "POST",
    name: block.data.label?.trim() || "AI",
    params: [],
    stepType: "ai",
    upstreamStepIds: incomingByTarget.get(block.id) ?? [],
    url: `${AI_PROVIDER_BASE_URLS[provider]}/chat/completions`,
  };
}

export function buildIncomingExecutableDependencies(
  flow: FlowDocument,
  executableBlockIds: Set<string>,
) {
  const incomingByTarget = new Map<string, string[]>();

  for (const connection of flow.connections) {
    addExecutableDependency(incomingByTarget, connection, executableBlockIds);
  }

  return incomingByTarget;
}

export function getAiProviderEnvKey(provider: AiProvider) {
  return `__luzo_ai_${provider}_api_key`;
}

function addExecutableDependency(
  incomingByTarget: Map<string, string[]>,
  connection: FlowConnection,
  executableBlockIds: Set<string>,
) {
  if (
    !executableBlockIds.has(connection.sourceBlockId) ||
    !executableBlockIds.has(connection.targetBlockId)
  ) {
    return;
  }

  incomingByTarget.set(connection.targetBlockId, [
    ...(incomingByTarget.get(connection.targetBlockId) ?? []),
    connection.sourceBlockId,
  ]);
}

function defaultModelForProvider(provider: AiProvider) {
  switch (provider) {
    case "openai":
      return "gpt-4o-mini";
    case "groq":
      return "llama-3.3-70b-versatile";
    case "openrouter":
    default:
      return "meta-llama/llama-3.3-70b-instruct";
  }
}
